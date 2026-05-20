import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const lessons = [
  {
    id: 1,
    title: 'Inflación',
    level: 'Básico',
    icon: 'trending-up-outline',
    description:
      'La inflación significa que los precios suben con el tiempo y tu dinero puede comprar menos cosas.',
    example:
      'Si hoy compras una comida con $100, pero el próximo año esa misma comida cuesta $110, tu dinero perdió poder adquisitivo.',
    tip:
      'Guardar todo el dinero sin generar rendimiento puede hacer que pierda valor con el tiempo.',
  },
  {
    id: 2,
    title: 'Interés compuesto',
    level: 'Básico',
    icon: 'cash-outline',
    description:
      'Es cuando los rendimientos generan nuevos rendimientos. Es decir, tu dinero crece sobre lo que ya ganó.',
    example:
      'Si inviertes $1,000 y ganas rendimiento, después el cálculo puede hacerse sobre el nuevo monto acumulado.',
    tip:
      'Mientras más tiempo mantengas una inversión o ahorro con rendimiento, mayor puede ser el efecto del interés compuesto.',
  },
  {
    id: 3,
    title: 'Presupuesto personal',
    level: 'Básico',
    icon: 'pie-chart-outline',
    description:
      'Un presupuesto te ayuda a decidir cuánto puedes gastar, ahorrar o separar para cada necesidad.',
    example:
      'Puedes dividir tu dinero en comida, transporte, ahorro, pagos fijos y entretenimiento.',
    tip:
      'Un presupuesto no sirve para limitarte, sino para saber en qué se va tu dinero.',
  },
  {
    id: 4,
    title: 'Método 50/30/20',
    level: 'Intermedio',
    icon: 'stats-chart-outline',
    description:
      'Es una estrategia para dividir tus ingresos: 50% necesidades, 30% deseos y 20% ahorro o pago de deuda.',
    example:
      'Si recibes $10,000, podrías usar $5,000 en necesidades, $3,000 en gustos y $2,000 en ahorro o deudas.',
    tip:
      'Puedes ajustar los porcentajes según tu realidad, pero la idea es separar ahorro desde el inicio.',
  },
  {
    id: 5,
    title: 'Fondo de emergencia',
    level: 'Básico',
    icon: 'shield-checkmark-outline',
    description:
      'Es dinero separado para imprevistos, como enfermedad, reparación, pérdida de ingreso o emergencia familiar.',
    example:
      'Una meta común es juntar entre 3 y 6 meses de tus gastos básicos.',
    tip:
      'Antes de invertir en activos riesgosos, conviene tener un fondo de emergencia.',
  },
  {
    id: 6,
    title: 'Riesgo y rendimiento',
    level: 'Intermedio',
    icon: 'warning-outline',
    description:
      'Generalmente, entre mayor rendimiento potencial, mayor riesgo. No existe ganancia segura sin riesgo.',
    example:
      'Un instrumento estable puede dar menor rendimiento, mientras que un activo como Ethereum puede subir o bajar mucho.',
    tip:
      'Nunca inviertas dinero que necesitas para gastos básicos o emergencias.',
  },
];

export default function FinancialEducationScreen({ navigation }) {
  const [selectedLesson, setSelectedLesson] = useState(lessons[0]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('IA')}
          >
            <Ionicons name="arrow-back" size={22} color="#062B5F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>Educación</Text>
            <Text style={styles.subtitle}>Conceptos financieros básicos</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="school-outline" size={22} color="#062B5F" />
          </View>
        </View>

        {/* HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Aprende finanzas paso a paso</Text>
          <Text style={styles.heroText}>
            Revisa conceptos clave para comprender mejor tu dinero, tus gastos,
            tus metas y tus decisiones financieras.
          </Text>
        </View>

        {/* PROGRESO */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.cardTitle}>Ruta de aprendizaje</Text>
              <Text style={styles.cardText}>Progreso estimado: 35%</Text>
            </View>

            <Text style={styles.progressPercent}>35%</Text>
          </View>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* CATEGORÍAS */}
        <Text style={styles.sectionTitle}>Temas disponibles</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {lessons.map((lesson) => (
            <TouchableOpacity
              key={lesson.id}
              style={[
                styles.lessonChip,
                selectedLesson.id === lesson.id && styles.lessonChipActive,
              ]}
              onPress={() => setSelectedLesson(lesson)}
            >
              <Ionicons
                name={lesson.icon}
                size={20}
                color={selectedLesson.id === lesson.id ? '#FFFFFF' : '#0A84FF'}
              />
              <Text
                style={[
                  styles.lessonChipText,
                  selectedLesson.id === lesson.id && styles.lessonChipTextActive,
                ]}
              >
                {lesson.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LECCIÓN SELECCIONADA */}
        <View style={styles.lessonCard}>
          <View style={styles.lessonHeader}>
            <View style={styles.lessonIcon}>
              <Ionicons name={selectedLesson.icon} size={28} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>{selectedLesson.title}</Text>
              <Text style={styles.level}>{selectedLesson.level}</Text>
            </View>
          </View>

          <Text style={styles.lessonSubtitle}>¿Qué significa?</Text>
          <Text style={styles.lessonText}>{selectedLesson.description}</Text>

          <View style={styles.exampleBox}>
            <View style={styles.exampleHeader}>
              <Ionicons name="bulb-outline" size={20} color="#0A84FF" />
              <Text style={styles.exampleTitle}>Ejemplo sencillo</Text>
            </View>
            <Text style={styles.exampleText}>{selectedLesson.example}</Text>
          </View>

          <View style={styles.tipBox}>
            <View style={styles.exampleHeader}>
              <Ionicons name="sparkles-outline" size={20} color="#B7791F" />
              <Text style={styles.tipTitle}>Tip de HEDA</Text>
            </View>
            <Text style={styles.tipText}>{selectedLesson.tip}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Marcar como aprendido</Text>
          </TouchableOpacity>
        </View>

        {/* MINI QUIZ */}
        <View style={styles.quizCard}>
          <View style={styles.quizHeader}>
            <View style={styles.quizIcon}>
              <Ionicons name="help-circle-outline" size={24} color="#0A84FF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Pregunta rápida</Text>
              <Text style={styles.cardText}>
                ¿Por qué es importante registrar tus gastos?
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.answerButton}>
            <Text style={styles.answerText}>
              Para saber en qué se va mi dinero y tomar mejores decisiones.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.answerButton}>
            <Text style={styles.answerText}>
              Para gastar más sin revisar mi saldo.
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADVERTENCIA */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color="#0A84FF" />
          <Text style={styles.infoText}>
            Este contenido es educativo e informativo. HEDA no sustituye asesoría
            financiera profesional ni toma decisiones por el usuario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    elevation: 2,
  },

  logo: {
    fontSize: 31,
    fontWeight: '900',
    color: '#062B5F',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  headerIcon: {
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
    marginBottom: 18,
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

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 4,
  },

  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  progressPercent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0A84FF',
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 20,
    overflow: 'hidden',
  },

  progressFill: {
    width: '35%',
    height: '100%',
    backgroundColor: '#062B5F',
    borderRadius: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 14,
  },

  horizontalList: {
    paddingBottom: 12,
  },

  lessonChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },

  lessonChipActive: {
    backgroundColor: '#062B5F',
  },

  lessonChipText: {
    marginLeft: 8,
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: '900',
  },

  lessonChipTextActive: {
    color: '#FFFFFF',
  },

  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    marginTop: 4,
    marginBottom: 18,
    elevation: 2,
  },

  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  lessonIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  lessonTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#062B5F',
  },

  level: {
    marginTop: 5,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
    backgroundColor: '#EAF4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  lessonSubtitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062B5F',
    marginBottom: 8,
  },

  lessonText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },

  exampleBox: {
    backgroundColor: '#EAF4FF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  exampleTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#062B5F',
  },

  exampleText: {
    fontSize: 14,
    color: '#24527A',
    lineHeight: 20,
    fontWeight: '600',
  },

  tipBox: {
    backgroundColor: '#FFF8E6',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F6D98B',
  },

  tipTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#7A4E00',
  },

  tipText: {
    fontSize: 14,
    color: '#7A4E00',
    lineHeight: 20,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#062B5F',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  quizHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  quizIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  answerButton: {
    backgroundColor: '#F4F7FB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDEBFA',
  },

  answerText: {
    color: '#062B5F',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },

  infoCard: {
    backgroundColor: '#EAF4FF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7EAFE',
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#24527A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});