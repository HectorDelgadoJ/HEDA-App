import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { sendMessageToHedaAI } from '../services/hedaAI';

export default function EducationScreen({ navigation }) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // =====================================================
  // ENVIAR PREGUNTA A HEDA AI
  // =====================================================

  const handleSendQuestion = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loadingAI) {
      return;
    }

    try {
      setLoadingAI(true);
      setAiError('');
      setAiResponse('');

      const result = await sendMessageToHedaAI(cleanQuestion);

      if (!result?.ok) {
        throw new Error(
          result?.message ||
            'HEDA AI no pudo procesar la solicitud.'
        );
      }

      setAiResponse(result.message);

      // Limpiamos el input después de una respuesta exitosa
      setQuestion('');
    } catch (error) {
      console.error('Error en HEDA AI:', error);

      setAiError(
        error?.message ||
          'No fue posible comunicarse con HEDA AI.'
      );
    } finally {
      setLoadingAI(false);
    }
  };

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>HEDA IA</Text>

            <Text style={styles.subtitle}>
              Educación financiera inteligente
            </Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons
              name="sparkles-outline"
              size={22}
              color="#062B5F"
            />
          </TouchableOpacity>
        </View>

        {/* TARJETA PRINCIPAL */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="sparkles"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Asistente financiero inteligente
          </Text>

          <Text style={styles.heroText}>
            Recibe explicaciones, recomendaciones y alertas
            basadas en tus hábitos financieros.
          </Text>
        </View>

        {/* PREGUNTA AL ASISTENTE */}
        <View style={styles.assistantCard}>
          <Text style={styles.sectionTitle}>
            Pregunta al asistente
          </Text>

          <Text style={styles.cardText}>
            Puedes consultar dudas sobre ahorro, gastos,
            presupuestos, metas o conceptos financieros.
          </Text>

          <View style={styles.inputBox}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#0A84FF"
            />

            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ej. ¿Cómo puedo ahorrar mejor?"
              placeholderTextColor="#A0A7B4"
              style={styles.input}
              editable={!loadingAI}
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={handleSendQuestion}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loadingAI && styles.primaryButtonDisabled,
            ]}
            onPress={handleSendQuestion}
            disabled={loadingAI}
            activeOpacity={0.8}
          >
            {loadingAI ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Enviar pregunta
              </Text>
            )}
          </TouchableOpacity>

          {/* RESPUESTA DE HEDA AI */}
          {aiResponse ? (
            <View style={styles.responseBox}>
              <View style={styles.responseHeader}>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#0A84FF"
                />

                <Text style={styles.responseTitle}>
                  HEDA AI
                </Text>
              </View>

              <Text style={styles.responseText}>
                {aiResponse}
              </Text>
            </View>
          ) : null}

          {/* ERROR */}
          {aiError ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color="#B42318"
              />

              <Text style={styles.errorText}>
                {aiError}
              </Text>
            </View>
          ) : null}
        </View>

        {/* RECOMENDACIÓN IA */}
        <View style={styles.aiAdviceCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color="#0A84FF"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Recomendación inteligente
              </Text>

              <Text style={styles.cardText}>
                Tus gastos en entretenimiento aumentaron esta
                semana. Considera ajustar tu presupuesto para
                mantener tu meta de ahorro.
              </Text>
            </View>
          </View>
        </View>

        {/* MÓDULOS */}
        <Text style={styles.sectionTitle}>
          Herramientas de IA
        </Text>

        <View style={styles.grid}>
          <ToolCard
            icon="school-outline"
            title="Educación"
            text="Aprende conceptos financieros básicos."
          />

          <ToolCard
            icon="analytics-outline"
            title="Hábitos"
            text="Analiza patrones de ingreso y gasto."
          />

          <ToolCard
            icon="warning-outline"
            title="Alertas"
            text="Detecta gastos inusuales o excesos."
          />

          <ToolCard
            icon="trending-up-outline"
            title="Ethereum"
            text="Consulta tendencias informativas."
            onPress={() => navigation.navigate('Ethereum')}
          />
        </View>

        {/* CONTENIDO EDUCATIVO */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Contenido recomendado
          </Text>

          <Text style={styles.sectionLink}>
            Ver todo
          </Text>
        </View>

        <LessonCard
          icon="cash-outline"
          title="Interés compuesto"
          description="Conoce cómo el dinero puede crecer con el tiempo mediante rendimientos acumulados."
          level="Básico"
        />

        <LessonCard
          icon="shield-checkmark-outline"
          title="Seguridad financiera digital"
          description="Aprende buenas prácticas para proteger tus datos, pagos y operaciones digitales."
          level="Básico"
        />

        <LessonCard
          icon="pie-chart-outline"
          title="Método 50/30/20"
          description="Organiza tus ingresos entre necesidades, deseos y ahorro de forma sencilla."
          level="Intermedio"
        />

        {/* ADVERTENCIA */}
        <View style={styles.warningCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#B7791F"
          />

          <Text style={styles.warningText}>
            Las recomendaciones de HEDA son informativas y
            educativas. La decisión final siempre corresponde
            al usuario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// TOOL CARD
// =====================================================

function ToolCard({ icon, title, text, onPress }) {
  return (
    <TouchableOpacity
      style={styles.toolCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.toolIcon}>
        <Ionicons
          name={icon}
          size={23}
          color="#0A84FF"
        />
      </View>

      <Text style={styles.toolTitle}>
        {title}
      </Text>

      <Text style={styles.toolText}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

// =====================================================
// LESSON CARD
// =====================================================

function LessonCard({
  icon,
  title,
  description,
  level,
}) {
  return (
    <View style={styles.lessonCard}>
      <View style={styles.lessonIcon}>
        <Ionicons
          name={icon}
          size={24}
          color="#0A84FF"
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>
            {title}
          </Text>

          <Text style={styles.level}>
            {level}
          </Text>
        </View>

        <Text style={styles.lessonDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  content: {
    padding: 22,
    paddingBottom: 115,
  },

  header: {
    marginTop: 10,
    marginBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#062B5F',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  heroCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 26,
    padding: 24,
    marginBottom: 20,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#DCEEFF',
    fontSize: 15,
    lineHeight: 21,
  },

  assistantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  inputBox: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#F4F7FB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#062B5F',
    paddingVertical: 14,
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // ===================================================
  // RESPUESTA HEDA AI
  // ===================================================

  responseBox: {
    marginTop: 16,
    backgroundColor: '#F4F9FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  responseTitle: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '900',
    color: '#062B5F',
  },

  responseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  // ===================================================
  // ERROR HEDA AI
  // ===================================================

  errorBox: {
    marginTop: 16,
    backgroundColor: '#FFF1F0',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDCA',
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
    fontWeight: '600',
  },

  aiAdviceCard: {
    backgroundColor: '#EAF4FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  aiHeader: {
    flexDirection: 'row',
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  toolCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  toolTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 6,
  },

  toolText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  sectionHeader: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
    textTransform: 'uppercase',
  },

  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  lessonTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
    flex: 1,
    marginRight: 8,
  },

  level: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0A84FF',
    backgroundColor: '#EAF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  lessonDescription: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  warningCard: {
    marginTop: 4,
    backgroundColor: '#FFF8E6',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F6D98B',
  },

  warningText: {
    flex: 1,
    marginLeft: 10,
    color: '#7A4E00',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});