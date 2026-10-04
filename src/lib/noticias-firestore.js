const FIREBASE_PROJECT_ID =
  import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ||
  import.meta.env.FIREBASE_PROJECT_ID ||
  'republica-actual';

const RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const RUN_AGGREGATION =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runAggregationQuery`;


// ============================================================
// CONVERTIR VALORES DE FIRESTORE
// ============================================================

function valorFirestore(field = {}) {

  if ('stringValue' in field) {
    return field.stringValue;
  }

  if ('integerValue' in field) {
    return Number(field.integerValue);
  }

  if ('doubleValue' in field) {
    return Number(field.doubleValue);
  }

  if ('booleanValue' in field) {
    return field.booleanValue;
  }

  if ('timestampValue' in field) {
    return field.timestampValue;
  }

  if ('nullValue' in field) {
    return null;
  }

  if ('arrayValue' in field) {
    return (
      field.arrayValue.values || []
    ).map(valorFirestore);
  }

  if ('mapValue' in field) {

    return Object.fromEntries(

      Object.entries(
        field.mapValue.fields || {}
      ).map(
        ([clave, valor]) => [
          clave,
          valorFirestore(valor)
        ]
      )

    );

  }

  return '';
}


// ============================================================
// CONVERTIR DOCUMENTO DE FIRESTORE
// ============================================================

function documentoFirestore(doc = {}) {

  const datos = Object.fromEntries(

    Object.entries(
      doc.fields || {}
    ).map(
      ([clave, valor]) => [
        clave,
        valorFirestore(valor)
      ]
    )

  );

  if (
    (
      datos.id === undefined ||
      datos.id === null ||
      datos.id === ''
    ) &&
    doc.name
  ) {

    datos.id =
      doc.name
        .split('/')
        .pop();

  }

  return datos;
}


// ============================================================
// EJECUTAR CONSULTA
// ============================================================

async function ejecutarQuery(structuredQuery) {

  const respuesta =
    await fetch(
      RUN_QUERY,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          structuredQuery
        })
      }
    );

  if (!respuesta.ok) {

    const detalle =
      await respuesta.text();

    throw new Error(
      `Firestore respondió ${respuesta.status}: ${detalle}`
    );

  }

  const resultado =
    await respuesta.json();

  return resultado

    .filter(
      (fila) =>
        fila.document
    )

    .map(
      (fila) =>
        documentoFirestore(
          fila.document
        )
    );

}


// ============================================================
// CARGAR NOTICIAS PUBLICADAS
// ============================================================
// IMPORTANTE:
// Ya NO descarga toda la colección.
// Por defecto carga solamente 20.
// ============================================================

export async function cargarNoticiasPublicadas(
  limite = 20
) {

  const cantidad =
    Math.max(
      1,
      Number(limite) || 20
    );

  return ejecutarQuery({

    from: [
      {
        collectionId: 'noticias'
      }
    ],

    where: {

      fieldFilter: {

        field: {
          fieldPath: 'publicado'
        },

        op: 'EQUAL',

        value: {
          booleanValue: true
        }

      }

    },

    orderBy: [
      {
        field: {
          fieldPath: 'created_at'
        },

        direction: 'DESCENDING'
      }
    ],

    limit: cantidad

  });

}


// ============================================================
// CONTAR NOTICIAS PUBLICADAS
// ============================================================
// Firestore hace COUNT.
// No descarga las 400+ noticias solo para conocer el total.
// ============================================================

export async function contarNoticiasPublicadas() {

  const respuesta =
    await fetch(
      RUN_AGGREGATION,
      {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({

          structuredAggregationQuery: {

            structuredQuery: {

              from: [
                {
                  collectionId:
                    'noticias'
                }
              ],

              where: {

                fieldFilter: {

                  field: {
                    fieldPath:
                      'publicado'
                  },

                  op:
                    'EQUAL',

                  value: {
                    booleanValue:
                      true
                  }

                }

              }

            },

            aggregations: [
              {
                alias: 'total',
                count: {}
              }
            ]

          }

        })

      }
    );

  if (!respuesta.ok) {

    const detalle =
      await respuesta.text();

    throw new Error(
      `Firestore conteo respondió ${respuesta.status}: ${detalle}`
    );

  }

  const resultado =
    await respuesta.json();

  const valor =
    resultado?.[0]
      ?.result
      ?.aggregateFields
      ?.total
      ?.integerValue
    ??
    resultado?.[0]
      ?.result
      ?.aggregateFields
      ?.total
      ?.doubleValue
    ??
    0;

  return Number(valor) || 0;
}


// ============================================================
// CARGAR LOTE
// ============================================================

async function cargarLote(
  limite = 100,
  cursorCreatedAt = null
) {

  const structuredQuery = {

    from: [
      {
        collectionId: 'noticias'
      }
    ],

    where: {

      fieldFilter: {

        field: {
          fieldPath: 'publicado'
        },

        op: 'EQUAL',

        value: {
          booleanValue: true
        }

      }

    },

    orderBy: [
      {
        field: {
          fieldPath: 'created_at'
        },

        direction: 'DESCENDING'
      }
    ],

    limit:
      Math.max(
        1,
        Number(limite) || 100
      )

  };


  if (cursorCreatedAt) {

    structuredQuery.startAt = {

      before: false,

      values: [
        {
          stringValue:
            String(cursorCreatedAt)
        }
      ]

    };

  }


  return ejecutarQuery(
    structuredQuery
  );

}


// ============================================================
// DATOS PARA PAGINACIÓN ESTÁTICA
// ============================================================

export async function cargarNoticiasParaPaginacion(
  porPagina = 10
) {

  const total =
    await contarNoticiasPublicadas();

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        total / porPagina
      )
    );


  if (total <= porPagina) {

    return {

      paginas: [],

      totalPaginas,

      total

    };

  }


  const todas = [];

  let cursor = null;

  const TAMANO_LOTE = 100;


  while (
    todas.length < total
  ) {

    const lote =
      await cargarLote(
        TAMANO_LOTE,
        cursor
      );


    if (!lote.length) {
      break;
    }


    todas.push(
      ...lote
    );


    const ultima =
      lote[
        lote.length - 1
      ];


    cursor =
      ultima?.created_at ||
      null;


    if (
      !cursor ||
      lote.length < TAMANO_LOTE
    ) {
      break;
    }

  }


  const paginas = [];


  for (
    let pagina = 2;
    pagina <= totalPaginas;
    pagina++
  ) {

    const inicio =
      (pagina - 1) *
      porPagina;


    paginas.push({

      pagina,

      noticias:
        todas.slice(
          inicio,
          inicio + porPagina
        )

    });

  }


  return {

    paginas,

    totalPaginas,

    total

  };

}