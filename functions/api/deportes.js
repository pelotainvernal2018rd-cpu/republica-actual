const JSON_HEADERS = {
    "content-type": "application/json; charset=UTF-8",
    "cache-control": "public, max-age=30, s-maxage=45"
  };
  
  const ESPN = {
    nba: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    nfl: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  
    futbol: [
      "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard"
    ]
  };
  
  
  // ======================================================
  // ESPN
  // ======================================================
  
  function estadoESPN(status = {}) {
  
    const state = status?.type?.state;
  
    if (state === "in") {
      return "live";
    }
  
    if (state === "post") {
      return "post";
    }
  
    return "pre";
  }
  
  
  function convertirESPN(
    evento,
    deporte,
    ligaFallback
  ) {
  
    const comp =
      evento?.competitions?.[0];
  
    if (!comp) {
      return null;
    }
  
  
    const home =
      comp.competitors?.find(
        (equipo) =>
          equipo.homeAway === "home"
      );
  
  
    const away =
      comp.competitors?.find(
        (equipo) =>
          equipo.homeAway === "away"
      );
  
  
    if (!home || !away) {
      return null;
    }
  
  
    const status =
      comp.status ||
      evento.status ||
      {};
  
  
    const state =
      estadoESPN(status);
  
  
    let icono = "🏆";
  
    if (deporte === "nba") {
      icono = "🏀";
    }
  
    if (deporte === "nfl") {
      icono = "🏈";
    }
  
    if (deporte === "futbol") {
      icono = "⚽";
    }
  
  
    let detalle = "";
  
    if (state === "live") {
  
      detalle =
        status?.type?.shortDetail ||
        status?.displayClock ||
        "EN VIVO";
  
    } else if (state === "post") {
  
      detalle = "Final";
  
    }
  
  
    return {
  
      id:
        `${deporte}-${evento.id}`,
  
      deporte,
  
      liga:
        evento?.league?.abbreviation ||
        ligaFallback,
  
      icono,
  
      state,
  
      detalle,
  
      fecha:
        evento.date || "",
  
  
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
          state === "pre"
            ? "-"
            : away.score ?? "-"
  
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
          state === "pre"
            ? "-"
            : home.score ?? "-"
  
      }
  
    };
  
  }
  
  
  async function cargarESPN(
    url,
    deporte,
    liga
  ) {
  
    const respuesta =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );
  
  
    if (!respuesta.ok) {
  
      throw new Error(
        `${liga}: ${respuesta.status}`
      );
  
    }
  
  
    const data =
      await respuesta.json();
  
  
    return (
      data.events || []
    )
      .map(
        (evento) =>
          convertirESPN(
            evento,
            deporte,
            liga
          )
      )
      .filter(Boolean);
  
  }
  
  
  // ======================================================
  // MLB / LIGAS DE BÉISBOL
  // ======================================================
  
  function estadoMLB(game = {}) {
  
    const estado =
      game.status
        ?.abstractGameState;
  
  
    if (estado === "Live") {
      return "live";
    }
  
  
    if (estado === "Final") {
      return "post";
    }
  
  
    return "pre";
  
  }
  
  
  function convertirMLB(
    game,
    deporte,
    liga
  ) {
  
    const state =
      estadoMLB(game);
  
  
    const away =
      game.teams?.away || {};
  
  
    const home =
      game.teams?.home || {};
  
  
    const inning =
      game.linescore
        ?.currentInningOrdinal;
  
  
    const inningState =
      game.linescore
        ?.inningState;
  
  
    let detalle = "";
  
  
    if (state === "live") {
  
      detalle =
        [
          inningState,
          inning
        ]
          .filter(Boolean)
          .join(" ");
  
    }
  
  
    if (state === "post") {
  
      detalle =
        game.status
          ?.detailedState ||
        "Final";
  
    }
  
  
    const crearEquipo = (
      equipo
    ) => {
  
      const id =
        equipo.team?.id;
  
  
      return {
  
        nombre:
          equipo.team?.name ||
          "Equipo",
  
        abbr:
          equipo.team
            ?.abbreviation ||
          "",
  
        logo:
          id
            ? `https://www.mlbstatic.com/team-logos/${id}.svg`
            : "",
  
        score:
          state === "pre"
            ? "-"
            : equipo.score ?? "-"
  
      };
  
    };
  
  
    return {
  
      id:
        `${deporte}-${game.gamePk}`,
  
      deporte,
  
      liga,
  
      icono: "⚾",
  
      state,
  
      detalle,
  
      fecha:
        game.gameDate || "",
  
      visitante:
        crearEquipo(away),
  
      local:
        crearEquipo(home)
  
    };
  
  }
  
  
  // ======================================================
  // FECHA REPÚBLICA DOMINICANA
  // ======================================================
  
  function obtenerFechaRD() {
  
    const partes =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/Santo_Domingo",
  
          year:
            "numeric",
  
          month:
            "2-digit",
  
          day:
            "2-digit"
        }
      )
        .formatToParts(
          new Date()
        );
  
  
    const datos = {};
  
  
    for (
      const parte of partes
    ) {
  
      if (
        parte.type !==
        "literal"
      ) {
  
        datos[
          parte.type
        ] =
          parte.value;
  
      }
  
    }
  
  
    return (
      `${datos.year}-` +
      `${datos.month}-` +
      `${datos.day}`
    );
  
  }
  
  
  // ======================================================
  // MLB
  // ======================================================
  
  async function cargarMLB(
    sportId,
    deporte,
    liga
  ) {
  
    const fecha =
      obtenerFechaRD();
  
  
    const url =
      "https://statsapi.mlb.com/api/v1/schedule" +
      `?sportId=${sportId}` +
      `&date=${fecha}` +
      "&hydrate=team,linescore";
  
  
    const respuesta =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );
  
  
    if (!respuesta.ok) {
  
      throw new Error(
        `${liga}: ${respuesta.status}`
      );
  
    }
  
  
    const data =
      await respuesta.json();
  
  
    let games =
      (
        data.dates || []
      )
        .flatMap(
          (fecha) =>
            fecha.games || []
        );
  
  
    // ================================================
    // LIDOM
    // Evita presentar otra liga invernal como LIDOM.
    // ================================================
  
    if (
      deporte ===
      "lidom"
    ) {
  
      games =
        games.filter(
          (game) => {
  
            const texto =
              JSON
                .stringify(game)
                .toLowerCase();
  
  
            return (
              texto.includes(
                "dominican"
              ) ||
              texto.includes(
                "lidom"
              )
            );
  
          }
        );
  
    }
  
  
    return games.map(
      (game) =>
        convertirMLB(
          game,
          deporte,
          liga
        )
    );
  
  }
  
  
  // ======================================================
  // ENDPOINT
  // ======================================================
  
  export async function onRequestGet() {
  
    const tareas = [
  
      // MLB
      cargarMLB(
        1,
        "mlb",
        "MLB"
      ),
  
  
      // LIGAS INVERNALES / LIDOM
      cargarMLB(
        17,
        "lidom",
        "LIDOM"
      ),
  
  
      // NBA
      cargarESPN(
        ESPN.nba,
        "nba",
        "NBA"
      ),
  
  
      // NFL
      cargarESPN(
        ESPN.nfl,
        "nfl",
        "NFL"
      ),
  
  
      // FÚTBOL
      ...ESPN.futbol.map(
        (url) =>
          cargarESPN(
            url,
            "futbol",
            "FÚTBOL"
          )
      )
  
    ];
  
  
    const resultados =
      await Promise.allSettled(
        tareas
      );
  
  
    const juegos =
      resultados
        .filter(
          (resultado) =>
            resultado.status ===
            "fulfilled"
        )
        .flatMap(
          (resultado) =>
            resultado.value
        )
        .filter(Boolean);
  
  
    // ELIMINAR DUPLICADOS
  
    const mapa =
      new Map();
  
  
    for (
      const juego of juegos
    ) {
  
      mapa.set(
        juego.id,
        juego
      );
  
    }
  
  
    const unicos =
      Array.from(
        mapa.values()
      );
  
  
    // ORDEN:
    // EN VIVO
    // PRÓXIMOS
    // FINALIZADOS
  
    const ordenEstado = {
      live: 0,
      pre: 1,
      post: 2
    };
  
  
    unicos.sort(
      (a, b) => {
  
        const estadoA =
          ordenEstado[
            a.state
          ] ?? 9;
  
  
        const estadoB =
          ordenEstado[
            b.state
          ] ?? 9;
  
  
        if (
          estadoA !==
          estadoB
        ) {
  
          return (
            estadoA -
            estadoB
          );
  
        }
  
  
        return (
          new Date(
            a.fecha
          ) -
          new Date(
            b.fecha
          )
        );
  
      }
    );
  
  
    return new Response(
  
      JSON.stringify({
  
        actualizado:
          new Date()
            .toISOString(),
  
        juegos:
          unicos
  
      }),
  
      {
        status: 200,
  
        headers:
          JSON_HEADERS
      }
  
    );
  
  }