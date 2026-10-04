const ESPN_NBA =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const MLB_API =
  "https://statsapi.mlb.com/api/v1";


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
    const r = await fetch(ESPN_NBA, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!r.ok) {
      throw new Error(`NBA ${r.status}`);
    }

    const data = await r.json();

    return (data.events || []).map((event) => {
      const comp =
        event.competitions?.[0] || {};

      const teams =
        comp.competitors || [];

      const home =
        teams.find(
          (t) => t.homeAway === "home"
        ) || {};

      const away =
        teams.find(
          (t) => t.homeAway === "away"
        ) || {};

      const type =
        event.status?.type || {};

      return {
        id: `nba-${event.id}`,

        deporte: "nba",

        liga: "NBA",

        icono: "🏀",

        state:
          estadoESPN(type),

        detalle:
          type.shortDetail ||
          type.detail ||
          "",

        fecha:
          event.date || "",

        stream_url: "",

        pitchers: null,

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
   CONSULTAR DATOS DE UN PITCHER
========================================================= */

async function obtenerPitcher(persona) {
  if (!persona?.id) {
    return null;
  }

  const id =
    persona.id;

  /*
   * IMPORTANTE:
   * Si esta consulta falla, solamente
   * perdemos los datos del pitcher.
   *
   * El partido MLB permanece visible.
   */

  try {
    const url =
      `${MLB_API}/people/${id}` +
      `?hydrate=stats(group=[pitching],type=[season])`;

    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!r.ok) {
      throw new Error(
        `Pitcher ${id}: ${r.status}`
      );
    }

    const data =
      await r.json();

    const person =
      data.people?.[0] ||
      persona;

    let wins = "";
    let losses = "";
    let era = "";

    const grupos =
      Array.isArray(person.stats)
        ? person.stats
        : [];

    for (const grupo of grupos) {
      const splits =
        grupo?.splits || [];

      for (const split of splits) {
        const stat =
          split?.stat || {};

        if (
          stat.wins !== undefined &&
          wins === ""
        ) {
          wins = stat.wins;
        }

        if (
          stat.losses !== undefined &&
          losses === ""
        ) {
          losses = stat.losses;
        }

        if (
          stat.era !== undefined &&
          era === ""
        ) {
          era = stat.era;
        }
      }
    }

    const mano =
      person.pitchHand?.code ||
      persona.pitchHand?.code ||
      "";

    return {
      id,

      nombre:
        person.fullName ||
        persona.fullName ||
        "Por anunciar",

      mano:
        mano
          ? `${mano}HP`
          : "",

      record:
        wins !== "" &&
        losses !== ""
          ? `${wins}-${losses}`
          : "",

      era:
        era !== ""
          ? String(era)
          : "",

      foto:
        `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_auto:best/v1/people/${id}/headshot/67/current`,
    };
  } catch (error) {
    console.error(
      "No se pudo cargar pitcher:",
      id,
      error
    );

    /*
     * FALLBACK:
     * Tenemos al menos el nombre y foto.
     */

    return {
      id,

      nombre:
        persona.fullName ||
        "Por anunciar",

      mano:
        persona.pitchHand?.code
          ? `${persona.pitchHand.code}HP`
          : "",

      record: "",

      era: "",

      foto:
        `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_auto:best/v1/people/${id}/headshot/67/current`,
    };
  }
}


/* =========================================================
   CARGAR CALENDARIO DE BÉISBOL
========================================================= */

async function cargarCalendario(
  sportId
) {
  const fecha =
    fechaRD();

  /*
   * AQUÍ NO PEDIMOS ESTADÍSTICAS.
   *
   * Primero obtenemos los partidos.
   *
   * Así los juegos nunca desaparecen
   * por un fallo de estadísticas.
   */

  const url =
    `${MLB_API}/schedule` +
    `?sportId=${sportId}` +
    `&date=${fecha}` +
    `&hydrate=team,probablePitcher`;

  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!r.ok) {
    throw new Error(
      `Calendario ${sportId}: ${r.status}`
    );
  }

  const data =
    await r.json();

  return (data.dates || [])
    .flatMap(
      (d) =>
        d.games || []
    );
}


/* =========================================================
   CONVERTIR PARTIDO MLB
========================================================= */

async function convertirJuegoMLB(
  g,
  deporte,
  liga
) {
  const away =
    g.teams?.away || {};

  const home =
    g.teams?.home || {};

  /*
   * Los pitchers se consultan DESPUÉS
   * de tener el juego.
   *
   * Promise.allSettled evita que un
   * pitcher dañe la tarjeta completa.
   */

  const pitchers =
    await Promise.allSettled([
      obtenerPitcher(
        away.probablePitcher
      ),

      obtenerPitcher(
        home.probablePitcher
      ),
    ]);

  const pitcherVisitante =
    pitchers[0]?.status ===
    "fulfilled"
      ? pitchers[0].value
      : null;

  const pitcherLocal =
    pitchers[1]?.status ===
    "fulfilled"
      ? pitchers[1].value
      : null;


  return {
    id:
      `${deporte}-${g.gamePk}`,

    deporte,

    liga,

    icono:
      "⚾",

    state:
      estadoMLB(
        g.status
      ),

    detalle:
      g.status?.detailedState ||
      "",

    fecha:
      g.gameDate ||
      "",

    stream_url:
      "",


    /* ===============================
       PITCHERS
    =============================== */

    pitchers: {
      visitante:
        pitcherVisitante,

      local:
        pitcherLocal,
    },


    /* ===============================
       VISITANTE
    =============================== */

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
        away.score ??
        "-",
    },


    /* ===============================
       LOCAL
    =============================== */

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
        home.score ??
        "-",
    },
  };
}


/* =========================================================
   MLB
========================================================= */

async function getMLB() {
  try {
    /*
     * PASO 1:
     * Obtener los juegos.
     */

    const games =
      await cargarCalendario(1);


    /*
     * PASO 2:
     * Crear cada tarjeta.
     *
     * Si un pitcher falla,
     * el partido continúa.
     */

    const resultados =
      await Promise.allSettled(
        games.map(
          (g) =>
            convertirJuegoMLB(
              g,
              "mlb",
              "MLB"
            )
        )
      );


    /*
     * Solamente descartamos una tarjeta
     * si falló completamente la conversión
     * del propio partido.
     */

    return resultados
      .filter(
        (r) =>
          r.status ===
          "fulfilled"
      )
      .map(
        (r) =>
          r.value
      );
  } catch (error) {
    console.error(
      "Error calendario MLB:",
      error
    );

    return [];
  }
}


/* =========================================================
   EQUIPOS REALES LIDOM
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


function normalizarTexto(texto) {
  return String(
    texto || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


function esEquipoLIDOM(nombre) {
  const n =
    normalizarTexto(nombre);

  return EQUIPOS_LIDOM.some(
    (equipo) =>
      n.includes(
        normalizarTexto(equipo)
      )
  );
}


/* =========================================================
   LIDOM
========================================================= */

async function getLIDOM() {
  try {
    /*
     * Esta fuente puede incluir
     * otras ligas de béisbol.
     *
     * NO marcamos automáticamente
     * todos los juegos como LIDOM.
     */

    const games =
      await cargarCalendario(17);


    /*
     * PRIMERO filtramos los equipos.
     *
     * Así Scottsdale, Peoria,
     * Salt River, etc. NO pasan.
     */

    const juegosLIDOM =
      games.filter(
        (g) => {
          const visitante =
            g.teams?.away?.team?.name ||
            "";

          const local =
            g.teams?.home?.team?.name ||
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


    /*
     * Ahora convertimos únicamente
     * los partidos dominicanos.
     */

    const resultados =
      await Promise.allSettled(
        juegosLIDOM.map(
          (g) =>
            convertirJuegoMLB(
              g,
              "lidom",
              "LIDOM"
            )
        )
      );


    return resultados
      .filter(
        (r) =>
          r.status ===
          "fulfilled"
      )
      .map(
        (r) =>
          r.value
      );
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

  /*
   * MLB + NBA + LIDOM se consultan
   * simultáneamente.
   *
   * Si una liga falla,
   * las demás siguen funcionando.
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
        resultado.status ===
        "fulfilled"
          ? resultado.value
          : []
    );


  /*
   * PROTECCIÓN FINAL:
   *
   * Solo permitimos estas tres ligas.
   */

  const permitidos =
    new Set([
      "mlb",
      "nba",
      "lidom",
    ]);


  const filtrados =
    juegos.filter(
      (g) =>
        permitidos.has(
          String(
            g.deporte || ""
          ).toLowerCase()
        )
    );


  return new Response(
    JSON.stringify({
      ok: true,

      actualizado:
        new Date()
          .toISOString(),

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