const ESPN_NBA =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const MLB_API =
  "https://statsapi.mlb.com/api/v1/schedule";

/*
  =========================================================
  TRANSMISIÓN FIJA MLB
  =========================================================
*/

const MLB_STREAM =
  "https://live2.eu-north-1b.cf.dmcdn.net/sec2(kd5I_QdhQCSICwAuQEjbFd0w_hv2bzxt5dT5XDbB0Jhu9V3hGiXPyyXyaDZT8U8iU3aCdgUGzjL71TKV4aHFuGNLA2UTT7ENoAd21m0KrGd0q4a5OZ4wfrsFyVlEB30c)/cloud/3/x8mwmvs/s/live-480.m3u8";


/* =========================================================
   FECHA REPÚBLICA DOMINICANA
========================================================= */

function fechaRD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (tipo) =>
    parts.find((p) => p.type === tipo)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}


/* =========================================================
   ESTADOS
========================================================= */

function estadoESPN(type) {
  if (type?.state === "in") return "live";
  if (type?.state === "post") return "post";

  return "pre";
}

function estadoMLB(status) {
  const code = String(
    status?.abstractGameCode || ""
  ).toUpperCase();

  if (code === "L") return "live";
  if (code === "F") return "post";

  return "pre";
}


/* =========================================================
   NBA
========================================================= */

async function getNBA() {
  try {
    const response = await fetch(ESPN_NBA, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`NBA ${response.status}`);
    }

    const data = await response.json();

    return (data.events || []).map((event) => {
      const competition =
        event.competitions?.[0] || {};

      const teams =
        competition.competitors || [];

      const home =
        teams.find(
          (team) => team.homeAway === "home"
        ) || {};

      const away =
        teams.find(
          (team) => team.homeAway === "away"
        ) || {};

      const type =
        event.status?.type || {};

      return {
        id: `nba-${event.id}`,

        deporte: "nba",
        liga: "NBA",
        icono: "🏀",

        state: estadoESPN(type),

        detalle:
          type.shortDetail ||
          type.detail ||
          "",

        fecha:
          event.date || "",

        /*
          NBA sin transmisión configurada.
        */

        stream_url: "",

        visitante: {
          nombre:
            away.team?.displayName ||
            away.team?.name ||
            "Visitante",

          abbr:
            away.team?.abbreviation ||
            "",

          logo:
            away.team?.logo ||
            "",

          score:
            away.score ?? "-",
        },

        local: {
          nombre:
            home.team?.displayName ||
            home.team?.name ||
            "Local",

          abbr:
            home.team?.abbreviation ||
            "",

          logo:
            home.team?.logo ||
            "",

          score:
            home.score ?? "-",
        },
      };
    });

  } catch (error) {
    console.error(
      "Error NBA:",
      error
    );

    return [];
  }
}


/* =========================================================
   MLB
========================================================= */

async function getMLB() {
  try {
    const fecha =
      fechaRD();

    const url =
      `${MLB_API}` +
      `?sportId=1` +
      `&date=${fecha}` +
      `&hydrate=team`;

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0",
        },
      });

    if (!response.ok) {
      throw new Error(
        `MLB ${response.status}`
      );
    }

    const data =
      await response.json();

    const partidos =
      (data.dates || [])
        .flatMap(
          (date) =>
            date.games || []
        );

    return partidos.map((game) => {
      const away =
        game.teams?.away || {};

      const home =
        game.teams?.home || {};

      const state =
        estadoMLB(
          game.status
        );

      return {
        id:
          `mlb-${game.gamePk}`,

        deporte:
          "mlb",

        liga:
          "MLB",

        icono:
          "⚾",

        state,

        detalle:
          game.status?.detailedState ||
          "",

        fecha:
          game.gameDate ||
          "",

        /*
          ===================================================
          TRANSMISIÓN MLB

          Esta es la URL fija que utilizará
          la página /en-vivo/ para los juegos MLB.
          ===================================================
        */

        stream_url:
          MLB_STREAM,

        pitchers: {
          visitante: null,
          local: null,
        },

        visitante: {
          nombre:
            away.team?.name ||
            "Visitante",

          abbr:
            away.team?.abbreviation ||
            "",

          logo:
            away.team?.id
              ? `https://www.mlbstatic.com/team-logos/${away.team.id}.svg`
              : "",

          score:
            away.score ?? "-",
        },

        local: {
          nombre:
            home.team?.name ||
            "Local",

          abbr:
            home.team?.abbreviation ||
            "",

          logo:
            home.team?.id
              ? `https://www.mlbstatic.com/team-logos/${home.team.id}.svg`
              : "",

          score:
            home.score ?? "-",
        },
      };
    });

  } catch (error) {
    console.error(
      "Error MLB:",
      error
    );

    return [];
  }
}


/* =========================================================
   LIDOM
========================================================= */

const EQUIPOS_LIDOM = [
  "tigres del licey",
  "licey",

  "aguilas cibaeñas",
  "águilas cibaeñas",
  "aguilas",

  "leones del escogido",
  "escogido",

  "estrellas orientales",
  "estrellas",

  "toros del este",
  "toros",

  "gigantes del cibao",
  "gigantes",
];


function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function esEquipoLIDOM(nombre) {
  const equipo =
    normalizar(nombre);

  return EQUIPOS_LIDOM.some(
    (permitido) =>
      equipo.includes(
        normalizar(
          permitido
        )
      )
  );
}


async function getLIDOM() {
  try {
    const fecha =
      fechaRD();

    const url =
      `${MLB_API}` +
      `?sportId=17` +
      `&date=${fecha}` +
      `&hydrate=team`;

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0",
        },
      });

    if (!response.ok) {
      throw new Error(
        `LIDOM ${response.status}`
      );
    }

    const data =
      await response.json();

    const partidos =
      (data.dates || [])
        .flatMap(
          (date) =>
            date.games || []
        );

    const lidom =
      partidos.filter(
        (game) => {
          const visitante =
            game.teams?.away?.team?.name ||
            "";

          const local =
            game.teams?.home?.team?.name ||
            "";

          return (
            esEquipoLIDOM(
              visitante
            ) &&
            esEquipoLIDOM(
              local
            )
          );
        }
      );

    return lidom.map((game) => {
      const away =
        game.teams?.away || {};

      const home =
        game.teams?.home || {};

      return {
        id:
          `lidom-${game.gamePk}`,

        deporte:
          "lidom",

        liga:
          "LIDOM",

        icono:
          "⚾",

        state:
          estadoMLB(
            game.status
          ),

        detalle:
          game.status?.detailedState ||
          "",

        fecha:
          game.gameDate ||
          "",

        /*
          LIDOM queda independiente.
          No utiliza automáticamente
          la transmisión MLB.
        */

        stream_url:
          "",

        pitchers: {
          visitante: null,
          local: null,
        },

        visitante: {
          nombre:
            away.team?.name ||
            "Visitante",

          abbr:
            "",

          logo:
            away.team?.id
              ? `https://www.mlbstatic.com/team-logos/${away.team.id}.svg`
              : "",

          score:
            away.score ?? "-",
        },

        local: {
          nombre:
            home.team?.name ||
            "Local",

          abbr:
            "",

          logo:
            home.team?.id
              ? `https://www.mlbstatic.com/team-logos/${home.team.id}.svg`
              : "",

          score:
            home.score ?? "-",
        },
      };
    });

  } catch (error) {
    console.error(
      "Error LIDOM:",
      error
    );

    return [];
  }
}


/* =========================================================
   API PRINCIPAL
========================================================= */

export async function onRequestGet() {
  const resultados =
    await Promise.allSettled([
      getMLB(),
      getNBA(),
      getLIDOM(),
    ]);

  const juegos =
    resultados.flatMap(
      (resultado) => {
        if (
          resultado.status ===
          "fulfilled"
        ) {
          return resultado.value;
        }

        return [];
      }
    );

  const permitidos =
    new Set([
      "mlb",
      "nba",
      "lidom",
    ]);

  const filtrados =
    juegos.filter(
      (game) =>
        permitidos.has(
          String(
            game.deporte || ""
          ).toLowerCase()
        )
    );

  return new Response(
    JSON.stringify({
      ok: true,

      actualizado:
        new Date().toISOString(),

      deportes: [
        "mlb",
        "nba",
        "lidom",
      ],

      juegos:
        filtrados,
    }),
    {
      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "public, max-age=30, s-maxage=45",
      },
    }
  );
}