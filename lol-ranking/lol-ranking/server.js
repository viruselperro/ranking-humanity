const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const RIOT_KEY = process.env.RIOT_API_KEY || '';

app.get('/api/player', async (req, res) => {
  const { gameName, tagLine } = req.query;
  const apiKey = req.headers['x-api-key'] || RIOT_KEY;
  if (!gameName || !tagLine) return res.status(400).json({ error: 'Faltan parámetros.' });
  try {
    const acctRes = await fetch(
      `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      { headers: { 'X-Riot-Token': apiKey } }
    );
    if (!acctRes.ok) {
      if (acctRes.status === 404) return res.status(404).json({ error: `"${gameName}#${tagLine}" no encontrado.` });
      if (acctRes.status === 403) return res.status(403).json({ error: 'API key inválida o expirada.' });
      return res.status(acctRes.status).json({ error: `Error ${acctRes.status} al buscar cuenta.` });
    }
    const acct = await acctRes.json();

    const sumRes = await fetch(
      `https://las1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${acct.puuid}`,
      { headers: { 'X-Riot-Token': apiKey } }
    );
    if (!sumRes.ok) return res.status(sumRes.status).json({ error: `Error ${sumRes.status} al obtener invocador.` });
    const sum = await sumRes.json();

    const rankRes = await fetch(
      `https://las1.api.riotgames.com/lol/league/v4/entries/by-summoner/${sum.id}`,
      { headers: { 'X-Riot-Token': apiKey } }
    );
    if (!rankRes.ok) return res.status(rankRes.status).json({ error: `Error ${rankRes.status} al obtener rango.` });
    const rankData = await rankRes.json();
    const sq = rankData.find(e => e.queueType === 'RANKED_SOLO_5x5');

    res.json({
      gameName,
      tagLine,
      tier: sq ? sq.tier : 'UNRANKED',
      rank: sq ? sq.rank : '',
      lp: sq ? sq.leaguePoints : 0,
      wins: sq ? sq.wins : 0,
      losses: sq ? sq.losses : 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
