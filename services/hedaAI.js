import { supabase } from './supabase';

const MAX_MESSAGE_LENGTH = 2000;

export async function sendMessageToHedaAI(message) {
  if (typeof message !== 'string') {
    throw new Error('El mensaje debe ser texto.');
  }

  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error('El mensaje es demasiado largo.');
  }

  // =====================================================
  // 1. COMPROBAR SESIÓN
  // =====================================================

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      'Error verificando sesión:',
      sessionError
    );

    throw new Error(
      'No se pudo verificar la sesión.'
    );
  }

  if (!session) {
    throw new Error(
      'Debes iniciar sesión para utilizar HEDA AI.'
    );
  }

  console.log(
    'HEDA AI - Usuario autenticado:',
    Boolean(session.user)
  );

  // IMPORTANTE:
  // No imprimimos el access_token en consola.

  // =====================================================
  // 2. LLAMAR A EDGE FUNCTION
  // =====================================================

  const { data, error } =
    await supabase.functions.invoke(
      'heda-ai',
      {
        body: {
          message: cleanMessage,
        },
      }
    );

  // =====================================================
  // 3. MOSTRAR ERROR REAL DEL BACKEND
  // =====================================================

  if (error) {
    console.error(
      'HEDA AI invoke error:',
      error
    );

    if (error.context) {
      try {
        console.log(
          'HEDA AI HTTP status:',
          error.context.status
        );

        const errorBody =
          await error.context.clone().text();

        console.log(
          'HEDA AI backend response:',
          errorBody
        );
      } catch (contextError) {
        console.error(
          'No se pudo leer la respuesta del backend:',
          contextError
        );
      }
    }

    throw new Error(
      'No fue posible comunicarse con HEDA AI.'
    );
  }

  // =====================================================
  // 4. RESPUESTA CORRECTA
  // =====================================================

  console.log(
    'HEDA AI response:',
    data
  );

  return data;
}