import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EducationScreen({ navigation }) {
  const [question, setQuestion] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');

  const suggestedQuestions = [
    '¿Cómo puedo ahorrar mejor?',
    '¿Qué es el interés compuesto?',
    '¿Cómo hago un presupuesto?',
    '¿Qué riesgo tiene Ethereum?',
  ];

  const generateMockResponse = () => {
    if (!question.trim()) {
      Alert.alert('Pregunta vacía', 'Escribe una pregunta para que HEDA pueda responderte.');
      return;
    }

    const lowerQuestion = question.toLowerCase();

    let response =
      'Con base en tu perfil financiero, te recomiendo revisar tus ingresos, gastos y metas antes de tomar una decisión. HEDA puede apoyarte con información educativa, pero la decisión final siempre corresponde al usuario.';

    if (lowerQuestion.includes('ahorrar') || lowerQuestion.includes('ahorro')) {
      response =
        'Para ahorrar mejor, puedes iniciar separando una cantidad fija cada vez que recibas ingresos. Una estrategia sencilla es usar el método 50/30/20: 50% para necesidades, 30% para gustos y 20% para ahorro o pago de deudas. También puedes crear una meta dentro de HEDA para dar seguimiento a tu avance.';
    }

    if (lowerQuestion.includes('presupuesto')) {
      response =
        'Un presupuesto sirve para definir límites de gasto por categoría. En HEDA puedes registrar tus gastos, clasificarlos y comparar cuánto llevas gastado contra el límite que estableciste. Esto ayuda a detectar excesos antes de que afecten tu saldo.';
    }

    if (lowerQuestion.includes('interés') || lowerQuestion.includes('compuesto')) {
      response =
        'El interés compuesto significa que los rendimientos generan nuevos rendimientos con el tiempo. Por ejemplo, si ahorras una cantidad y obtienes rendimiento, en el siguiente periodo el cálculo puede hacerse sobre el monto inicial más el rendimiento acumulado.';
    }

    if (
      lowerQuestion.includes('ethereum') ||
      lowerQuestion.includes('cripto') ||
      lowerQuestion.includes('criptomoneda')
    ) {
      response =
        'Ethereum es un activo digital altamente volátil. En HEDA se presenta únicamente con fines informativos y educativos. La aplicación puede mostrar tendencias, riesgos y gráficas, pero no recomienda comprar, vender ni garantiza resultados financieros.';
    }

    if (lowerQuestion.includes('deuda') || lowerQuestion.includes('tarjeta')) {
      response =
        'Para controlar deudas, conviene identificar el monto total, la tasa de interés y la fecha de pago. Prioriza deudas con mayor interés y evita usar crédito para gastos que no puedas cubrir después. HEDA puede ayudarte a registrar pagos recurrentes y alertas.';
    }

    setAssistantResponse(response);
  };

  const selectSuggestedQuestion = (item) => {
    setQuestion(item);
    setAssistantResponse('');
  };

  const clearAssistant = () => {
    setQuestion('');
    setAssistantResponse('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>HEDA IA</Text>
            <Text style={styles.subtitle}>Educación financiera inteligente</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="sparkles-outline" size={22} color="#062B5F" />
          </TouchableOpacity>
        </View>

        {/* TARJETA PRINCIPAL */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Asistente financiero inteligente</Text>
          <Text style={styles.heroText}>
            Recibe explicaciones, recomendaciones y alertas basadas en tus hábitos financieros.
          </Text>
        </View>

        {/* PREGUNTA AL ASISTENTE */}
        <View style={styles.assistantCard}>
          <Text style={styles.sectionTitle}>Pregunta al asistente</Text>
          <Text style={styles.cardText}>
            Puedes consultar dudas sobre ahorro, gastos, presupuestos, metas o conceptos financieros.
          </Text>

          <View style={styles.suggestionsContainer}>
            {suggestedQuestions.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.suggestionChip}
                onPress={() => selectSuggestedQuestion(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0A84FF" />
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ej. ¿Cómo puedo ahorrar mejor?"
              placeholderTextColor="#A0A7B4"
              style={styles.input}
              multiline
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={generateMockResponse}>
            <Ionicons name="send-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Enviar pregunta</Text>
          </TouchableOpacity>

          {assistantResponse ? (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <View style={styles.responseIcon}>
                  <Ionicons name="sparkles" size={18} color="#0A84FF" />
                </View>

                <Text style={styles.responseTitle}>Respuesta de HEDA</Text>
              </View>

              <Text style={styles.responseText}>{assistantResponse}</Text>

              <TouchableOpacity style={styles.clearButton} onPress={clearAssistant}>
                <Text style={styles.clearButtonText}>Limpiar consulta</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* RECOMENDACIÓN IA */}
        <View style={styles.aiAdviceCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Ionicons name="bulb-outline" size={22} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Recomendación inteligente</Text>
              <Text style={styles.cardText}>
                Tus gastos en entretenimiento aumentaron esta semana. Considera ajustar tu presupuesto
                para mantener tu meta de ahorro.
              </Text>
            </View>
          </View>
        </View>

        {/* MÓDULOS */}
        <Text style={styles.sectionTitle}>Herramientas de IA</Text>

        <View style={styles.grid}>
          <ToolCard
            icon="school-outline"
            title="Educación"
            text="Aprende conceptos financieros básicos."
            onPress={() => navigation.navigate('EducacionFinanciera')}
          />

          <ToolCard
            icon="analytics-outline"
            title="Hábitos"
            text="Analiza patrones de ingreso y gasto."
            onPress={() => navigation.navigate('Habitos')}
          />

          <ToolCard
            icon="warning-outline"
            title="Alertas"
            text="Detecta gastos inusuales o excesos."
            onPress={() => navigation.navigate('Alertas')}
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
          <Text style={styles.sectionTitle}>Contenido recomendado</Text>
          <Text style={styles.sectionLink}>Ver todo</Text>
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
          <Ionicons name="information-circle-outline" size={22} color="#B7791F" />
          <Text style={styles.warningText}>
            Las recomendaciones de HEDA son informativas y educativas. La decisión final siempre
            corresponde al usuario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolCard({ icon, title, text, onPress }) {
  return (
    <TouchableOpacity style={styles.toolCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.toolIcon}>
        <Ionicons name={icon} size={23} color="#0A84FF" />
      </View>

      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolText}>{text}</Text>
    </TouchableOpacity>
  );
}

function LessonCard({ icon, title, description, level }) {
  return (
    <View style={styles.lessonCard}>
      <View style={styles.lessonIcon}>
        <Ionicons name={icon} size={24} color="#0A84FF" />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{title}</Text>
          <Text style={styles.level}>{level}</Text>
        </View>

        <Text style={styles.lessonDescription}>{description}</Text>
      </View>
    </View>
  );
}

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

  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 8,
  },

  suggestionChip: {
    backgroundColor: '#EAF4FF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  suggestionText: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '900',
  },

  inputBox: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#F4F7FB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#062B5F',
    paddingVertical: 14,
    minHeight: 50,
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },

  responseCard: {
    marginTop: 18,
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDEBFA',
  },

  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  responseIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  responseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
  },

  responseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },

  clearButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },

  clearButtonText: {
    color: '#0A84FF',
    fontWeight: '900',
    fontSize: 13,
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