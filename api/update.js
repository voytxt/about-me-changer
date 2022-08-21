import 'dotenv/config';
import fetch from 'node-fetch';

export default async function handler(request, response) {
  const [statusCode, message] = await main();
  return response.status(statusCode).send(message);
}

async function main() {
  log('Starting cron');

  let statusCode = 200;
  let message = '';

  const stats = await getTetrisStats();
  if (stats === undefined) {
    log((message = 'ERROR: Bio not updated, because stats are undefined'));
    return [(statusCode = 500), message];
  }

  const bio = process.env.BIO_TEMPLATE.replace('\\n', '\n')
    .replace('{TR}', stats.TR)
    .replace('{standing}', stats.standing)
    .replace('{sprint}', stats.sprint);

  const [success, response] = await getPreviousBio();
  if (!success) {
    log((message = `ERROR: Could not fetch previous bio in DB: ${response}`));
    return [(statusCode = 500), message];
  }

  const previousBio = JSON.parse(response.replaceAll('\n', ''));

  if (previousBio !== bio.replaceAll('\n', '')) {
    const [success, response] = await updateBio(bio);
    if (success) log((message = `Bio updated with new stats: ${JSON.stringify(stats)}`));
    else {
      log((message = `ERROR: Bio should've updated but didn't ${JSON.stringify(response)}`));
      statusCode = 500;
    }
  } else {
    log((message = `Bio not updated, because stats didn't change: ${JSON.stringify(stats)}`));
  }

  {
    const [success, response] = await setPreviousBio(bio);
    if (!success) {
      log((message = `ERROR: Could not update previous bio in DB: ${response}`));
      return [(statusCode = 500), message];
    }
  }

  return [statusCode, message];
}

async function updateBio(bio) {
  // https://stackoverflow.com/a/70355708
  const response = await fetch('https://discord.com/api/v9/users/@me', {
    method: 'PATCH',
    headers: {
      authorization: process.env.DISCORD_TOKEN,
      'Content-type': 'application/json',
    },
    body: JSON.stringify({ bio }),
  });
  const data = await response.json();
  return [response.ok, data];
}

async function getTetrisStats() {
  try {
    const tetrioLeague = (await (await fetch('https://ch.tetr.io/api/users/vojta'))?.json())?.data.user.league;
    const tetrioSprint = (await (await fetch('https://ch.tetr.io/api/users/vojta/records'))?.json())?.data.records['40l'].record;
    const jstrisSprint = (await (await fetch('https://jstris.jezevec10.com/api/u/Vojta/records/1?mode=1&'))?.json())?.min;

    if (tetrioLeague && tetrioSprint && jstrisSprint) {
      return {
        TR: (Math.floor(tetrioLeague.rating / 100) / 10).toFixed(1) + 'k',
        standing: '#' + tetrioLeague.standing_local,
        sprint: Math.min(Math.floor(jstrisSprint * 10) / 10, Math.floor(tetrioSprint.endcontext.finalTime / 100) / 10).toFixed(1) + 's',
      };
    } else {
      log("ERROR: Couldn't fetch tetris stats:", { tetrioLeague, tetrioSprint, jstrisSprint });
    }
  } catch {
    log("ERROR: Coudln't fetch tetris stats, this is probably because jstris/tetr.io responded with invalid json");
  }
}

export const getPreviousBio = async () => {
  const response = await fetch(process.env.DB_URL);
  const data = await response.text();
  return [response.ok, data];
};

export const setPreviousBio = async (newBio) => {
  const response = await fetch(process.env.DB_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `"${newBio.replaceAll('\n', '')}"`,
  });
  const data = await response.text();
  return [response.ok, data];
};

function log(...message) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...message);
}
