export async function onRequestPost(context) {
    try {
      const deployHook = context.env.CLOUDFLARE_DEPLOY_HOOK;
  
      if (!deployHook) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Falta configurar CLOUDFLARE_DEPLOY_HOOK en Cloudflare.'
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        );
      }
  
      const respuesta = await fetch(deployHook, {
        method: 'POST'
      });
  
      if (!respuesta.ok) {
        const detalle = await respuesta.text();
  
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Cloudflare Deploy Hook respondió ${respuesta.status}`,
            detalle
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        );
      }
  
      return new Response(
        JSON.stringify({
          ok: true,
          mensaje: 'Despliegue iniciado.'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          }
        }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            error?.message ||
            'No se pudo iniciar el despliegue.'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      );
    }
  }