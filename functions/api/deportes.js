const ESPN_NBA =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const MLB_API =
  "https://statsapi.mlb.com/api/v1/schedule";


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

  const get = (t) =>
    parts.find((p) => p.type === t)?.value || "";

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
      teams.find((t) => t.homeAway === "home") || {};

    const away =
      teams.find((t) => t.homeAway === "away") || {};

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

      stream_url: "",

      visitante: {
        nombre:
          away.team?.displayName ||
          away.team?.name ||
          "Visitante",

        abbr:
          away.team?.abbreviation || "",

        logo:
          away.team?.logo || "",

        score:
          away.score ?? "-",
      },

      local: {
        nombre:
          home.team?.displayName ||
          home.team?.name ||
          "Local",

        abbr:
          home.team?.abbreviation || "",

        logo:
          home.team?.logo || "",

        score:
          home.score ?? "-",
      },
    };
  });
}


/* =========================================================
   ESTADÍSTICAS DE PITCHERS
========================================================= */

function statValue(stats, key) {
  const groups =
    Array.isArray(stats)
      ? stats
      : [];

  for (const group of groups) {
    const splits =
      group?.splits || [];

    for (const split of splits) {
      const stat =
        split?.stat || {};

      if (
        stat[key] !== undefined &&
        stat[key] !== null
      ) {
        return stat[key];
      }
    }
  }

  return "";
}


/* =========================================================
   INFORMACIÓN DEL PITCHER
========================================================= */

function pitcherData(person) {
  if (!person?.id) {
    return null;
  }

  const wins =
    statValue(
      person.stats,
      "wins"
    );

  const losses =
    statValue(
      person.stats,
      "losses"
    );

  const era =
    statValue(
      person.stats,
      "era"
    );

  const hand =
    person.pitchHand?.code ||
    person.pitchHand?.description ||
    "";

  return {
    id:
      person.id,

    nombre:
      person.fullName ||
      person.lastFirstName ||
      "Por anunciar",

    mano:
      hand
        ? `${hand}HP`
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
      `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_auto:best/v1/people/${person.id}/headshot/67/current`,
  };
}


/* =========================================================
   BASEBALL
========================================================= */

async function getBaseball(
  sportId,
  deporte,
  liga
) {
  const date =
    fechaRD();

  /*
   * Pedimos:
   *
   * - Equipos
   * - Pitcher probable
   * - Estadísticas de temporada
   *
   * Esto permite mostrar tarjetas similares
   * a MLB con foto, récord y ERA.
   */

  const hydrate =
    encodeURIComponent(
      "team,probablePitcher,probablePitcher(stats(group=[pitching],type=[season]))"
    );

  const url =
    `${MLB_API}` +
    `?sportId=${sportId}` +
    `&date=${date}` +
    `&hydrate=${hydrate}`;

  const r =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0",
        },
      }
    );

  if (!r.ok) {
    throw new Error(
      `${liga} ${r.status}`
    );
  }

  const data =
    await r.json();

  const games =
    (data.dates || [])
      .flatMap(
        (d) =>
          d.games || []
      );

  return games.map(
    (g) => {
      const away =
        g.teams?.away || {};

      const home =
        g.teams?.home || {};

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

        /*
         * IMPORTANTE:
         *
         * Solo se coloca una URL aquí
         * cuando tengamos una transmisión
         * autorizada.
         */

        stream_url:
          "",


        /* ===============================
           PITCHERS PROBABLES
        =============================== */

        pitchers: {
          visitante:
            pitcherData(
              away.probablePitcher
            ),

          local:
            pitcherData(
              home.probablePitcher
            ),
        },


        /* ===============================
           EQUIPO VISITANTE
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
           EQUIPO LOCAL
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
  );
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
   EQUIPOS REALES DE LIDOM
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


/* =========================================================
   VERIFICAR EQUIPO LIDOM
========================================================= */

function esEquipoLIDOM(nombre) {
  const n =
    String(nombre || "")
      .toLowerCase();

  return EQUIPOS_LIDOM.some(
    (equipo) =>
      n.includes(equipo)
  );
}


/* =========================================================
   LIDOM
========================================================= */

async function getLIDOM() {

  /*
   * sportId 17 puede devolver diferentes
   * competiciones de béisbol.
   *
   * Por eso NO marcamos automáticamente
   * todo como LIDOM.
   */

  const juegos =
    await getBaseball(
      17,
      "winter",
      "Winter"
    );


  /*
   * Solo aceptamos el partido cuando
   * AMBOS equipos pertenecen realmente
   * a LIDOM.
   */

  return juegos

    .filter(
      (g) =>
        esEquipoLIDOM(
          g.visitante?.nombre
        ) &&
        esEquipoLIDOM(
          g.local?.nombre
        )
    )

    .map(
      (g) => ({
        ...g,

        deporte:
          "lidom",

        liga:
          "LIDOM",

        id:
          String(g.id)
            .replace(
              /^winter-/,
              "lidom-"
            ),
      })
    );
}


/* =========================================================
   API PRINCIPAL
========================================================= */

export async function onRequestGet() {

  /*
   * Las tres ligas se consultan
   * simultáneamente.
   *
   * Si una falla, las demás siguen
   * funcionando.
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
   * Protección adicional:
   *
   * La página SOLO puede recibir:
   *
   * MLB
   * NBA
   * LIDOM
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