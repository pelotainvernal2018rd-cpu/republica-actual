const ESPN_NBA =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const MLB_API =
  "https://statsapi.mlb.com/api/v1/schedule";


/* =========================================================
   FECHA ACTUAL EN REPÚBLICA DOMINICANA
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
   ESTADOS DE PARTIDOS
========================================================= */

function estadoESPN(type) {
  if (type?.state === "in") {
    return "live";
  }

  if (type?.state === "post") {
    return "post";
  }

  return "pre";
}


function estadoMLB(status) {
  const code = String(
    status?.abstractGameCode || ""
  ).toUpperCase();

  if (code === "L") {
    return "live";
  }

  if (code === "F") {
    return "post";
  }

  return "pre";
}


/* =========================================================
   NBA
========================================================= */

async function getNBA() {
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
       * stream_url queda vacío por defecto.
       *
       * Cuando tengamos una transmisión autorizada
       * para ese partido podemos colocar aquí la URL.
       *
       * El botón VER EN VIVO solamente aparecerá
       * cuando:
       *
       * state === "live"
       * y
       * stream_url tenga una dirección.
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
}


/* =========================================================
   MLB / LIDOM
========================================================= */

async function getBaseball(
  sportId,
  deporte,
  liga
) {
  const date = fechaRD();

  const url =
    `${MLB_API}` +
    `?sportId=${sportId}` +
    `&date=${date}` +
    `&hydrate=team`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${liga} ${response.status}`
    );
  }

  const data =
    await response.json();

  const games =
    (data.dates || []).flatMap(
      (date) => date.games || []
    );

  return games.map((game) => {
    const away =
      game.teams?.away || {};

    const home =
      game.teams?.home || {};

    return {
      id:
        `${deporte}-${game.gamePk}`,

      deporte,

      liga,

      icono: "⚾",

      state:
        estadoMLB(game.status),

      detalle:
        game.status?.detailedState ||
        "",

      fecha:
        game.gameDate ||
        "",

      /*
       * IMPORTANTE:
       *
       * Solo coloca aquí una transmisión
       * que tengamos autorización para mostrar.
       *
       * Mientras esté vacío no aparecerá
       * el botón VER EN VIVO.
       */
      stream_url: "",

      visitante: {
        nombre:
          away.team?.name ||
          "Visitante",

        abbr: "",

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

        abbr: "",

        logo:
          home.team?.id
            ? `https://www.mlbstatic.com/team-logos/${home.team.id}.svg`
            : "",

        score:
          home.score ?? "-",
      },
    };
  });
}


/* =========================================================
   MLB
========================================================= */

async function getMLB() {
  return getBaseball(
    1,
    "mlb",
    "MLB"
  );
}


/* =========================================================
   LIDOM
========================================================= */

async function getLIDOM() {
  const juegos =
    await getBaseball(
      17,
      "lidom",
      "LIDOM"
    );

  /*
   * sportId 17 puede incluir otras
   * ligas invernales.
   *
   * Por eso filtramos equipos / referencias
   * relacionadas con República Dominicana.
   */

  return juegos.filter((game) => {
    const texto =
      JSON.stringify(game)
        .toLowerCase();

    return (
      texto.includes("dominican") ||
      texto.includes("lidom") ||

      texto.includes("aguilas") ||
      texto.includes("águilas") ||

      texto.includes("licey") ||

      texto.includes("escogido") ||

      texto.includes("gigantes") ||

      texto.includes("estrellas") ||

      texto.includes("toros")
    );
  });
}


/* =========================================================
   API CLOUDFLARE
========================================================= */

export async function onRequestGet() {
  /*
   * ÚNICAMENTE:
   *
   * MLB
   * NBA
   * LIDOM
   */

  const resultados =
    await Promise.allSettled([
      getMLB(),
      getNBA(),
      getLIDOM(),
    ]);

  const juegos =
    resultados.flatMap(
      (resultado) =>
        resultado.status === "fulfilled"
          ? resultado.value
          : []
    );


  /*
   * FILTRO FINAL DE SEGURIDAD
   *
   * Aunque alguna fuente devolviera
   * información inesperada, ningún
   * otro deporte podrá salir.
   */

  const deportesPermitidos =
    new Set([
      "mlb",
      "nba",
      "lidom",
    ]);


  const filtrados =
    juegos.filter((game) =>
      deportesPermitidos.has(
        String(
          game.deporte || ""
        ).toLowerCase()
      )
    );


  /*
   * RESPUESTA
   */

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

      juegos: filtrados,
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