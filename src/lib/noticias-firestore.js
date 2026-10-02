const FIREBASE_PROJECT_ID =
  import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ||
  import.meta.env.FIREBASE_PROJECT_ID ||
  'republica-actual';

let promesaNoticias = null;


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
// CONSULTA ÚNICA A FIRESTORE
// ============================================================

async function consultarFirestore() {

  console.log(
    'Firestore: realizando carga central de noticias publicadas...'
  );


  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;


  const respuesta =
    await fetch(
      endpoint,
      {

        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({

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

          }

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


  const noticias =
    resultado

      .filter(
        (fila) =>
          fila.document
      )

      .map(
        (fila) =>
          documentoFirestore(
            fila.document
          )
      )

      .sort(
        (a, b) =>
          (
            Date.parse(
              b.created_at || ''
            ) || 0
          )
          -
          (
            Date.parse(
              a.created_at || ''
            ) || 0
          )
      );


  console.log(
    `Firestore: carga central completada con ${noticias.length} noticias.`
  );


  return noticias;
}


// ============================================================
// FUNCIÓN CENTRAL EXPORTADA
// ============================================================

export function cargarNoticiasPublicadas() {

  if (!promesaNoticias) {

    promesaNoticias =
      consultarFirestore()
        .catch(
          (error) => {

            promesaNoticias =
              null;

            throw error;

          }
        );

  } else {

    console.log(
      'Firestore: reutilizando noticias ya cargadas.'
    );

  }


  return promesaNoticias;
}