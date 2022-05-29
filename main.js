import 'dotenv/config';
import cron from 'node-cron';
import fetch from 'node-fetch';

let previousBio = '';

cron.schedule('*/30 * * * *', async () => {
  log('Starting cron');

  const stats = await getTetrisStats();
  if (stats === undefined) {
    log('Bio not updated, because stats are undefined');
    return;
  }

  const bio = `from :flag_cz: (bit.ly/wherethefuckisczechia)
  
tetris player (**${stats.TR}** TR, **${stats.standing}** :flag_cz:, **${stats.sprint}** 40L)
javascript enthusiast (sometimes)

pronunciation: **voy**age **ta**xi`;

  if (previousBio !== bio) {
    const [success, response] = await updateBio(bio);

    if (success) log('Bio updated with new stats:', stats);
    else log("ERROR: Bio should've updated but didn't", response);
  } else {
    log("Bio not updated, because stats didn't change:", stats);
  }

  previousBio = bio;
});

// https://stackoverflow.com/a/70355708
async function updateBio(bio) {
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
  const tetrioLeague = (await (await fetch('https://ch.tetr.io/api/users/vojta'))?.json())?.data.user.league;
  const tetrioSprint = (await (await fetch('https://ch.tetr.io/api/users/vojta/records'))?.json())?.data.records['40l'].record;
  const jstrisSprint = (await (await fetch('https://jstris.jezevec10.com/api/u/Vojta/records/1?mode=1&'))?.json())?.min;

  if (tetrioLeague && tetrioSprint && jstrisSprint) {
    return {
      TR: Math.floor(tetrioLeague.rating / 100) / 10 + 'k',
      standing: '#' + tetrioLeague.standing_local,
      sprint: Math.min(Math.floor(jstrisSprint * 10) / 10, Math.floor(tetrioSprint.endcontext.finalTime / 100) / 10) + 's',
    };
  } else {
    log("ERROR: Couldn't fetch tetris stats:", { tetrioLeague, tetrioSprint, jstrisSprint });
  }
}

function log(...message) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...message);
}
