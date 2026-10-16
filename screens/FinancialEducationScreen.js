import SwipeBackToIA from '../components/SwipeBackToIA';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../services/supabase';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

const quizzes = {
  1: { question: '¿Qué pasa con tu poder adquisitivo si los precios suben y tu ingreso sigue igual?', options: ['Puedes comprar más cosas.', 'Puedes comprar menos cosas.'], correct: 1, explanation: 'Con la misma cantidad de dinero, el aumento de precios reduce lo que puedes comprar.' },
  2: { question: '¿Sobre qué se calculan los nuevos rendimientos en el interés compuesto?', options: ['Sobre el capital y los rendimientos acumulados.', 'Siempre sobre el monto inicial únicamente.'], correct: 0, explanation: 'Los rendimientos que se reinvierten también pueden generar rendimientos.' },
  3: { question: '¿Para qué te ayuda un presupuesto?', options: ['Para gastar sin revisar tus ingresos.', 'Para planear gastos y separar dinero para tus metas.'], correct: 1, explanation: 'Un presupuesto relaciona tus ingresos con tus necesidades, compromisos y metas.' },
  4: { question: 'En el ejemplo 50/30/20, ¿qué representa el 20%?', options: ['Ahorro o pago de deuda.', 'Todos tus gastos de entretenimiento.'], correct: 0, explanation: 'Es una guía flexible: puedes adaptar los porcentajes a tus posibilidades.' },
  5: { question: '¿Para qué sirve un fondo de emergencia?', options: ['Para comprar cualquier gusto del mes.', 'Para cubrir imprevistos sin desajustar tus gastos habituales.'], correct: 1, explanation: 'Separa los imprevistos de los gastos que ya tenías planeados.' },
  6: { question: '¿Un rendimiento potencial alto garantiza una ganancia?', options: ['No, también debes considerar el riesgo de perder.', 'Sí, si la promesa de rendimiento es muy alta.'], correct: 0, explanation: 'El rendimiento potencial no es una garantía. El valor de una inversión puede disminuir.' },
};

export default function FinancialEducationScreen({ navigation }) {
  const [selectedLesson, setSelectedLesson] = useState(lessons[0]);
  const [learnedIds, setLearnedIds] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const owner = useRef(undefined);
  const generation = useRef(0);
  const busy = useRef(false);
  const scroll = useRef(null);
  const lessonY = useRef(0);
  const reload = useRef(() => {});
  const progress = Math.round((learnedIds.length / lessons.length) * 100);
  const quiz = quizzes[selectedLesson.id];
  const completed = learnedIds.includes(selectedLesson.id);
  const correct = answer === quiz.correct;
  const nextLesson = lessons.find((lesson) => lesson.id > selectedLesson.id && !learnedIds.includes(lesson.id))
    || lessons.find((lesson) => !learnedIds.includes(lesson.id));

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    async function loadUser(userId, force = false) {
      const key = userId ? `heda:education:v1:${userId}` : null;
      if (!active || (!force && owner.current === key)) return;
      owner.current = key;
      const version = ++generation.current;
      setLearnedIds([]); setAnswer(null); setSelectedLesson(lessons[0]);
      setReady(false); setLoading(true); setNotice(''); setSaving(false);
      if (!key) {
        setLoading(false); setNotice('Inicia sesión para guardar tu progreso.'); return;
      }
      try {
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Invalid progress');
        const ids = [...new Set(parsed.filter((id) => lessons.some((lesson) => lesson.id === id)))];
        if (!active || generation.current !== version) return;
        setLearnedIds(ids);
        setSelectedLesson(lessons.find((lesson) => !ids.includes(lesson.id)) || lessons[0]);
        setReady(true);
      } catch {
        if (active && generation.current === version) setNotice('No pudimos leer tu progreso. Reintenta antes de continuar.');
      } finally {
        if (active && generation.current === version) setLoading(false);
      }
    }
    reload.current = () => loadUser(owner.current?.replace('heda:education:v1:', ''), true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true; void loadUser(session?.user?.id);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!authEventSeen && active) {
        if (error) { setLoading(false); setNotice('No pudimos comprobar tu sesión. Vuelve a abrir esta pantalla.'); }
        else void loadUser(data.session?.user?.id);
      }
    }).catch(() => { if (active && !authEventSeen) { setLoading(false); setNotice('No pudimos comprobar tu sesión. Vuelve a abrir esta pantalla.'); } });
    return () => { active = false; generation.current += 1; subscription.unsubscribe(); };
  }, []);

  function selectLesson(lesson, moveToLesson = false) {
    setSelectedLesson(lesson); setAnswer(null);
    if (moveToLesson) requestAnimationFrame(() => scroll.current?.scrollTo({ y: lessonY.current, animated: true }));
  }

  async function completeLesson() {
    if (!ready || loading || busy.current || !correct || completed || !owner.current) return;
    busy.current = true; setSaving(true); setNotice('');
    const version = generation.current;
    const ids = [...new Set([...learnedIds, selectedLesson.id])];
    try {
      await AsyncStorage.setItem(owner.current, JSON.stringify(ids));
      if (generation.current === version) setLearnedIds(ids);
    } catch {
      if (generation.current === version) setNotice('No se guardó esta lección. Toca Completar lección para reintentar.');
    } finally {
      busy.current = false;
      if (generation.current === version) setSaving(false);
    }
  }

  return <SwipeBackToIA navigation={navigation}><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView ref={scroll} style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Educación" subtitle="Entiende tu dinero, un tema a la vez." actionIcon="arrow-back" actionLabel="Volver a herramientas de IA" onAction={() => navigation.navigate('IA')} />
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{progress === 100 ? '¡Completaste tu ruta!' : 'Tu ruta de aprendizaje'}</Text><Text style={styles.cardText}>{loading ? 'Cargando tu progreso…' : `${learnedIds.length} de ${lessons.length} lecciones completadas`}</Text></View>
          <View style={styles.progressBadge}><Ionicons name={progress === 100 ? 'trophy-outline' : 'school-outline'} size={23} color={colors.primary} /><Text style={styles.progressPercent}>{progress}%</Text></View>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressBackground}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        <Text style={styles.localNote}>Tu avance se guarda por cuenta en este dispositivo.</Text>
      </View>
      {notice ? <View accessibilityLiveRegion="polite" style={styles.notice}><Text style={styles.cardText}>{notice}</Text>{!ready && owner.current ? <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => reload.current()} disabled={loading}><Text style={styles.linkText}>Reintentar</Text></TouchableOpacity> : null}</View> : null}
      <Text style={styles.sectionTitle}>Elige qué aprender</Text>
      <View style={styles.topicGrid}>{lessons.map((lesson) => {
        const selected = selectedLesson.id === lesson.id;
        const learned = learnedIds.includes(lesson.id);
        return <TouchableOpacity key={lesson.id} accessibilityRole="button" accessibilityState={{ selected, disabled: saving }} accessibilityLabel={`${lesson.title}. ${learned ? 'Completada' : 'Pendiente'}`} disabled={saving} style={[styles.topic, selected && styles.topicSelected]} onPress={() => selectLesson(lesson, true)}>
          <View style={styles.topicTop}><Ionicons name={lesson.icon} size={22} color={selected ? '#FFFFFF' : colors.primary} /><Ionicons name={learned ? 'checkmark-circle' : 'chevron-forward'} size={19} color={learned ? (selected ? '#FFFFFF' : '#15803D') : (selected ? '#FFFFFF' : colors.muted)} /></View>
          <Text style={[styles.topicTitle, selected && styles.white]}>{lesson.title}</Text>
          <Text style={[styles.topicMeta, selected && styles.white]}>{learned ? 'Completada' : `${lesson.level} · Lectura breve`}</Text>
        </TouchableOpacity>;
      })}</View>
      <View onLayout={(event) => { lessonY.current = event.nativeEvent.layout.y; }} style={styles.lessonCard}>
        <View style={styles.lessonHeader}><View style={styles.lessonIcon}><Ionicons name={selectedLesson.icon} size={28} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.topicMeta}>LECCIÓN {selectedLesson.id} DE {lessons.length}</Text><Text accessibilityRole="header" style={styles.lessonTitle}>{selectedLesson.title}</Text><Text style={styles.level}>{completed ? 'Completada ✓' : selectedLesson.level}</Text></View></View>
        <Text style={styles.lessonSubtitle}>¿Qué significa?</Text><Text style={styles.lessonText}>{selectedLesson.description}</Text>
        <View style={styles.exampleBox}><View style={styles.exampleHeader}><Ionicons name="bulb-outline" size={20} color={colors.primary} /><Text style={styles.exampleTitle}>Ejemplo sencillo</Text></View><Text style={styles.exampleText}>{selectedLesson.example}</Text></View>
        <View style={styles.tipBox}><View style={styles.exampleHeader}><Ionicons name="sparkles-outline" size={20} color="#B7791F" /><Text style={styles.tipTitle}>Quédate con esta idea</Text></View><Text style={styles.tipText}>{selectedLesson.tip}</Text></View>
        <View style={styles.quizHeader}><View style={styles.quizIcon}><Ionicons name="help-circle-outline" size={24} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Ponlo en práctica</Text><Text style={styles.cardText}>{quiz.question}</Text></View></View>
        {quiz.options.map((option, index) => {
          const chosen = answer === index;
          return <TouchableOpacity key={`${selectedLesson.id}-${index}`} accessibilityRole="radio" accessibilityState={{ checked: chosen, disabled: loading || saving || !ready }} disabled={loading || saving || !ready} style={[styles.answerButton, chosen && (correct ? styles.answerCorrect : styles.answerWrong)]} onPress={() => setAnswer(index)}><View style={styles.answerRow}><Ionicons name={chosen ? (correct ? 'checkmark-circle' : 'close-circle') : 'ellipse-outline'} size={21} color={chosen ? (correct ? '#15803D' : '#B91C1C') : colors.muted} /><Text style={[styles.answerText, { flex: 1 }]}>{option}</Text></View></TouchableOpacity>;
        })}
        {answer !== null ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: correct ? '#15803D' : '#B91C1C' }]}>{correct ? `¡Correcto! ${quiz.explanation}` : 'Todavía no. Revisa la idea principal y prueba la otra respuesta.'}</Text> : <Text style={styles.localNote}>Elige una respuesta para completar la lección.</Text>}
        {completed ? <View><Text accessibilityLiveRegion="polite" style={styles.savedText}>✓ Lección completada y guardada</Text><TouchableOpacity accessibilityRole="button" style={styles.primaryButton} onPress={() => nextLesson ? selectLesson(nextLesson, true) : navigation.navigate('IA')}><Text style={styles.primaryButtonText}>{nextLesson ? 'Siguiente lección →' : 'Volver a herramientas'}</Text></TouchableOpacity></View> : <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !correct || !ready || saving }} disabled={!correct || !ready || saving} style={[styles.primaryButton, (!correct || !ready || saving) && styles.disabled]} onPress={completeLesson}><Text style={styles.primaryButtonText}>{saving ? 'Guardando…' : 'Completar lección'}</Text></TouchableOpacity>}
      </View>
      <View style={styles.infoCard}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={styles.infoText}>Contenido educativo. Tu avance se conserva al cerrar la app, pero no se sincroniza entre dispositivos. HEDA no toma decisiones financieras por ti.</Text></View>
    </ScrollView>
  </SafeAreaView></SwipeBackToIA>;
}

const styles = StyleSheet.create({
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  topic: { width: '48%', flexGrow: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, minHeight: 124 },
  topicSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  topicTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  topicTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 7 },
  topicMeta: { fontSize: 11, lineHeight: 16, color: colors.muted },
  white: { color: '#FFFFFF' },
  progressBadge: { alignItems: 'center', gap: 4, marginLeft: 12 },
  localNote: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 12, marginBottom: 12 },
  notice: { backgroundColor: '#FFF8E6', padding: 14, borderRadius: 16, marginBottom: 16 },
  retry: { paddingVertical: 12, minHeight: 44 },
  linkText: { color: colors.primary, fontWeight: '700' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  answerCorrect: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  answerWrong: { borderColor: '#B91C1C', backgroundColor: '#FEF2F2' },
  feedback: { fontSize: 14, lineHeight: 21, marginVertical: 12 },
  savedText: { color: '#15803D', fontWeight: '700', textAlign: 'center', marginVertical: 16 },
  disabled: { opacity: 0.45 },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 28,
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },

  cardText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },

  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },

  progressBackground: {
    height: 9,
    backgroundColor: '#DDEBFA',
    borderRadius: 18,
    overflow: 'hidden',
  },

  progressFill: {
    width: '35%',
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 14,
  },

  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
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
    borderRadius: 18,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  lessonTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.ink,
  },

  level: {
    marginTop: 5,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.softBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  lessonSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },

  lessonText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },

  exampleBox: {
    backgroundColor: colors.softBlue,
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
    fontWeight: '700',
    color: colors.ink,
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
    fontWeight: '700',
    color: '#7A4E00',
  },

  tipText: {
    fontSize: 14,
    color: '#7A4E00',
    lineHeight: 20,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  quizHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  quizIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  answerButton: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDEBFA',
  },

  answerText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },

  infoCard: {
    backgroundColor: colors.softBlue,
    borderRadius: 18,
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