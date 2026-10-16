import { conversationHistory, beginChatTurn } from '../utils/aiConversation';
import { supabase } from '../services/supabase';
import SearchAttribution from '../components/SearchAttribution';
import ScreenHeader from '../components/ScreenHeader';
import { layout } from '../theme/layout';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { previewHedaFinances, sendMessageToHedaAI } from '../services/hedaAI';

export default function EducationScreen({ navigation }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [failure, setFailure] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [financialContext, setFinancialContext] = useState(null);
  const [financialPreview, setFinancialPreview] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const requestRef = useRef(null);
  const generation = useRef(0);
  const ownerRef = useRef(null);
  const sequence = useRef(0);
  const scrollToLatest = useRef(false);

  function commit(next) { messagesRef.current = next; setMessages(next); }
  function resetChat() {
    generation.current++;
    requestRef.current?.abort();
    requestRef.current = null;
    commit([]); setQuestion(''); setFailure(null); setLoadingAI(false);
    setFinancialContext(null); setFinancialPreview(null); setSummaryLoading(false);
  }

  useEffect(() => {
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id || null;
      if (event === 'SIGNED_OUT' || (ownerRef.current && ownerRef.current !== id)) resetChat();
      ownerRef.current = id;
    });
    return () => { generation.current++; requestRef.current?.abort(); subscription.unsubscribe(); };
  }, []);

  function newConversation() {
    if (!messagesRef.current.length && !question.trim() && !financialContext) return;
    Alert.alert('Nueva conversación', 'Se borrarán los mensajes de esta pantalla y HEDA empezará sin ese contexto. Esto no elimina registros del proveedor.', [
      {text:'Cancelar',style:'cancel'}, {text:'Empezar de nuevo',onPress:resetChat},
    ]);
  }

  async function openFinancialPreview() {
    if (requestRef.current) return;
    const requestGeneration = generation.current;
    const controller = new AbortController();
    requestRef.current = controller; setSummaryLoading(true); Keyboard.dismiss();
    try {
      const preview = await previewHedaFinances({signal:controller.signal});
      if (generation.current === requestGeneration) setFinancialPreview(preview);
    } catch (error) {
      if (generation.current === requestGeneration) Alert.alert('No pudimos preparar el resumen',error?.message || 'Inténtalo de nuevo.');
    } finally {
      if (generation.current === requestGeneration) {requestRef.current=null;setSummaryLoading(false);}
    }
  }
  function approveFinancialPreview() {
    if (!financialPreview || requestRef.current) return;
    const approved = financialPreview;
    resetChat(); setFinancialContext(approved);
    send('Analiza el resumen de mis registros de este mes. Explica mis principales gastos, cómo afectan mis tarjetas al saldo y qué pasos de ahorro podría considerar sin asumir gastos o ingresos que no registré.',approved);
  }

  async function send(overrideText, approvedSummary = financialContext) {
    const text = typeof overrideText === 'string' ? overrideText : question.trim();
    if (!text || requestRef.current) return;
    const turn = ++sequence.current;
    const userId = `user-${turn}`;
    const requestGeneration = generation.current;
    const history = conversationHistory(messagesRef.current);
    const controller = new AbortController();
    requestRef.current = controller;
    commit(beginChatTurn(messagesRef.current, text, userId));
    setQuestion(text); setFailure(null); setLoadingAI(true); Keyboard.dismiss(); scrollToLatest.current = true;
    try {
      const result = await sendMessageToHedaAI(text, history, {signal:controller.signal,summaryDigest:approvedSummary?.summaryDigest});
      if (generation.current !== requestGeneration) return;
      commit([...messagesRef.current.map(item => item.id === userId ? {...item,status:'complete'} : item), {
        id:`assistant-${turn}`, role:'assistant', status:'complete', text:result.message,
        sources:Array.isArray(result.sources) ? result.sources.filter(item=>typeof item.url==='string' && item.url.startsWith('https://')) : [],
        searchHtml:typeof result.searchHtml === 'string' ? result.searchHtml : '', webEnabled:result.webEnabled === true, financialSummaryUsed:result.financialSummaryUsed === true,
      }]);
      setQuestion(''); scrollToLatest.current = true;
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      commit(messagesRef.current.map(item => item.id === userId ? {...item,status:'failed'} : item));
      setFailure({code:error?.code || '',message:error?.message || 'No pudimos responder. Inténtalo de nuevo.'});
      scrollToLatest.current = true;
    } finally {
      if (generation.current === requestGeneration) { requestRef.current = null; setLoadingAI(false); }
    }
  }

  return <SafeAreaView edges={['top','left','right']} style={styles.safe}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.chatHeader}><ScreenHeader title="HEDA IA" subtitle="Asistente y herramientas financieras" icon="sparkles-outline" />
        <View style={styles.sectionSwitch}>
          <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:!toolsOpen}} onPress={()=>{Keyboard.dismiss();setToolsOpen(false);}} style={[styles.sectionOption,!toolsOpen&&styles.sectionOptionActive]}>
            <Ionicons name="chatbubbles-outline" size={21} color={!toolsOpen?'#FFFFFF':colors.primary}/><View style={{flex:1}}><Text style={[styles.sectionOptionTitle,!toolsOpen&&styles.sectionOptionTitleActive]}>Asistente</Text><Text style={[styles.sectionOptionHint,!toolsOpen&&styles.sectionOptionHintActive]}>Habla con HEDA</Text></View>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:toolsOpen}} onPress={()=>{Keyboard.dismiss();setToolsOpen(true);}} style={[styles.sectionOption,toolsOpen&&styles.sectionOptionActive]}>
            <Ionicons name="grid-outline" size={21} color={toolsOpen?'#FFFFFF':colors.primary}/><View style={{flex:1}}><Text style={[styles.sectionOptionTitle,toolsOpen&&styles.sectionOptionTitleActive]}>Herramientas</Text><Text style={[styles.sectionOptionHint,toolsOpen&&styles.sectionOptionHintActive]}>Educación y más</Text></View>
          </TouchableOpacity>
        </View>
        {!toolsOpen&&<View style={styles.chatToolbar}>
          <TouchableOpacity accessibilityRole="button" style={[styles.newChatButton,{flex:1}]} onPress={newConversation}><Ionicons name="add" size={18} color={colors.primary}/><Text style={[styles.suggestionText,{flexShrink:1}]}>Nueva conversación</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={loadingAI||summaryLoading} style={[styles.analyzeButton,(loadingAI||summaryLoading)&&{opacity:0.5}]} onPress={openFinancialPreview}>{summaryLoading?<ActivityIndicator color="#FFFFFF" size="small"/>:<Ionicons name="pie-chart-outline" size={18} color="#FFFFFF"/>}<Text style={styles.analyzeButtonText}>{summaryLoading?'Preparando…':'Analizar mis finanzas'}</Text></TouchableOpacity>
        </View>}
      </View>
      {toolsOpen&&<ScrollView style={styles.container} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.toolsHeading}>¿Qué quieres explorar?</Text>
        <Text style={styles.toolsDescription}>Aprende conceptos, revisa hábitos y consulta información financiera.</Text>
        <View style={styles.grid}>
          <ToolCard icon="school-outline" title="Educación" text="Aprende finanzas paso a paso con ejemplos sencillos." accent="#2463B5" tint="#EAF2FF" onPress={()=>navigation.navigate('EducacionFinanciera')}/>
          <ToolCard icon="analytics-outline" title="Hábitos" text="Descubre patrones en tus ingresos y gastos registrados." accent="#7951B0" tint="#F2ECFC" onPress={()=>navigation.navigate('Habitos')}/>
          <ToolCard icon="notifications-outline" title="Alertas" text="Revisa pagos pendientes y configura presupuestos mensuales." accent="#A65B16" tint="#FFF1E3" onPress={()=>navigation.navigate('Alertas')}/>
          <ToolCard icon="trending-up-outline" title="Ethereum" text="Consulta el módulo informativo de criptomonedas." accent="#167B83" tint="#E5F5F5" onPress={()=>navigation.navigate('Ethereum')}/>
        </View>
      </ScrollView>}
      <View style={{flex:1,display:toolsOpen?'none':'flex'}}>
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onContentSizeChange={()=>{if(scrollToLatest.current){scrollRef.current?.scrollToEnd({animated:true});scrollToLatest.current=false;}}}>
        {financialContext&&<View style={styles.summaryBadge}><Ionicons name="checkmark-circle-outline" size={19} color="#157347"/><View style={{flex:1}}><Text style={styles.summaryBadgeTitle}>Resumen compartido en este chat</Text><Text style={styles.aboutButtonText}>Hasta {financialContext.summary.period.end} · Sin búsqueda web</Text></View><TouchableOpacity accessibilityRole="button" style={styles.aboutButton} onPress={()=>setFinancialPreview(financialContext)}><Text style={styles.suggestionText}>Ver</Text></TouchableOpacity></View>}
        {!messages.length && <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}><Ionicons name="sparkles" size={27} color={colors.primary}/></View>
          <Text style={styles.welcomeTitle}>Una pregunta puede ser un buen comienzo</Text>
          <Text style={styles.cardText}>Hablemos de ahorro, presupuesto o tarjetas. Puedes seguir la conversación con “explícamelo mejor”.</Text>
          <View style={styles.welcomeSuggestions}>{[['Ahorro','¿Cómo empiezo a ahorrar?'],['Presupuesto','¿Cómo organizo mi salario?'],['Tarjetas','¿Cómo funciona el pago de una tarjeta?']].map(([label,text])=><TouchableOpacity key={label} accessibilityRole="button" style={styles.suggestion} onPress={()=>{setQuestion(text);inputRef.current?.focus();}}><Text style={styles.suggestionText}>{label}</Text><Ionicons name="add" size={15} color={colors.primary}/></TouchableOpacity>)}</View>
        </View>}
        {messages.map(item=><View key={item.id} style={[styles.chatBubble,item.role==='user'?styles.userBubble:styles.assistantBubble]}>
          <Text style={[styles.bubbleAuthor,item.role==='user'&&{color:'#E2EDFF'}]}>{item.role==='user'?'Tú':'HEDA'}</Text>
          <Text selectable style={[styles.bubbleText,item.role==='user'&&{color:'#FFFFFF'}]}>{item.text}</Text>
          {item.status==='failed'&&<Text style={styles.outgoingStatus}>Sin respuesta · Puedes editar y reintentar abajo</Text>}
          {item.role==='assistant'&&<>
            {item.financialSummaryUsed?<Text style={styles.privacyNote}>Basado en el resumen autorizado · No consulta internet.</Text>:item.webEnabled===false&&<Text style={styles.privacyNote}>Sin búsqueda web · No verifica datos actuales.</Text>}
            <SearchAttribution html={item.searchHtml}/>
            {item.sources.length>0&&<View style={{marginTop:10}}><Text style={styles.suggestionText}>Fuentes consultadas</Text>{item.sources.map((source,index)=><TouchableOpacity key={source.url} accessibilityRole="link" style={styles.responseAction} onPress={()=>Linking.openURL(source.url).catch(()=>Alert.alert('Fuente','No pudimos abrir este enlace.'))}><Text style={styles.suggestionText}>{index+1}. {source.title||source.url}</Text></TouchableOpacity>)}</View>}
          </>}
        </View>)}
        {loadingAI&&<View accessibilityLiveRegion="polite" style={styles.thinkingRow}><ActivityIndicator size="small" color={colors.primary}/><Text style={styles.cardText}>HEDA está escribiendo…</Text></View>}
        {failure&&<View accessibilityLiveRegion="polite" style={styles.failureCard}>
          <Text style={styles.failureTitle}>{failure.code==='AI_RATE_LIMIT'?'Límite de consultas alcanzado':'No pudimos responder'}</Text>
          <Text style={styles.failureText}>{failure.code==='AI_RATE_LIMIT'?'Tu pregunta sigue escrita. El límite puede ser temporal o requerir revisar la cuota del proyecto. Inténtalo más tarde.':failure.message}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton} disabled={loadingAI||summaryLoading||!question.trim()} onPress={failure.code==='SUMMARY_CHANGED'?openFinancialPreview:send}><Ionicons name="refresh-outline" size={16} color={colors.primary}/><Text style={styles.suggestionText}>{failure.code==='SUMMARY_CHANGED'?'Revisar resumen actualizado':'Reintentar'}</Text></TouchableOpacity>
        </View>}
      </ScrollView>
      <View style={styles.composer}>
        <View style={styles.composerInfo}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:privacyOpen}} style={styles.aboutButton} onPress={()=>setPrivacyOpen(value=>!value)}><Ionicons name="shield-checkmark-outline" size={15} color={colors.muted}/><Text style={styles.aboutButtonText}>Privacidad y contexto</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.aboutButton} onPress={()=>Alert.alert('Límites del asistente','El uso tiene límites compartidos del proyecto. HEDA avisa si se alcanza uno, pero no conoce la cuota restante en tiempo real.')}><Text style={styles.aboutButtonText}>Límites</Text><Ionicons name="information-circle-outline" size={16} color={colors.muted}/></TouchableOpacity>
        </View>
        {privacyOpen&&<Text style={styles.composerPrivacy}>Se envían tu pregunta y mensajes recientes de este chat a Google Gemini; el nivel gratuito puede usar el contenido para mejorar productos. No compartas datos sensibles. El chat se conserva solo en memoria mientras usas la app y se limpia al cerrar sesión o iniciar uno nuevo. Solo comparte un resumen calculado de tus registros si lo revisas y autorizas con Analizar mis finanzas. Nueva conversación deja de compartirlo.</Text>}
        <View style={styles.composerRow}>
          <TextInput ref={inputRef} value={question} onChangeText={setQuestion} placeholder={messages.length?'Pregunta algo más…':'Escribe tu pregunta…'} placeholderTextColor={colors.muted} multiline maxLength={2000} editable={!loadingAI&&!summaryLoading} accessibilityLabel="Mensaje para HEDA" style={styles.composerInput}/>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={failure?'Reintentar mensaje':'Enviar mensaje'} disabled={loadingAI||summaryLoading||!question.trim()} onPress={send} style={[styles.sendChatButton,(loadingAI||!question.trim())&&{opacity:0.45}]}>{loadingAI?<ActivityIndicator color="#FFFFFF" size="small"/>:<Ionicons name="arrow-up" size={23} color="#FFFFFF"/>}</TouchableOpacity>
        </View>
        <Text style={styles.composerHint}>{question.length}/2000 · Contexto reciente; no es memoria permanente.</Text>
      </View>
      </View>
      <Modal visible={!!financialPreview} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setFinancialPreview(null)}>
        <SafeAreaProvider><SafeAreaView edges={['top','bottom','left','right']} style={styles.safe}>
          <View style={styles.summaryModalHeader}><Text accessibilityRole="header" style={styles.toolsHeading}>Revisa tu resumen</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar resumen sin compartir" style={styles.summaryClose} onPress={()=>setFinancialPreview(null)}><Ionicons name="close" size={25} color={colors.ink}/></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{padding:18,paddingTop:0}}>
            {financialPreview&&<FinancialSummaryPreview summary={financialPreview.summary}/>}
            <Text style={styles.consentExplanation}>Al continuar enviarás estos importes a Google Gemini y comenzarás un chat nuevo. Los seguimientos usarán el mismo resumen mientras esté activo. En el nivel gratuito, Google puede usar el contenido para mejorar productos.</Text>
            <Text style={styles.consentExplanation}>No se envían nombres, correos, notas, identificadores ni nombres de tarjetas o metas. La búsqueda web estará desactivada en este chat. No se harán cambios ni pagos.</Text>
          </ScrollView>
          <View style={styles.consentFooter}><TouchableOpacity accessibilityRole="button" style={styles.consentPrimary} onPress={approveFinancialPreview}><Text style={styles.analyzeButtonText}>Compartir y analizar</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF"/></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.summaryCancel} onPress={()=>setFinancialPreview(null)}><Text style={styles.suggestionText}>Cancelar · No compartir</Text></TouchableOpacity></View>
        </SafeAreaView></SafeAreaProvider>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function FinancialSummaryPreview({summary}) {
  const currency = value => '$' + Number(value||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const rows=[['Saldo registrado disponible',summary.availableBalance],['Ingresos del periodo',summary.monthly.income],['Gastos del periodo',summary.monthly.expenses],['Ingresos menos gastos',summary.monthly.result],['Cambio del saldo en el periodo',summary.monthly.cashChange],['Pagos de tarjetas (sin duplicar gastos)',summary.monthly.cardPayments],['Deuda de tarjetas con seguimiento',summary.cards.debt],['Saldo a favor en tarjetas',summary.cards.credit],['Avance acumulado en metas activas',summary.goals.saved],['Objetivo total de metas activas',summary.goals.target],['Falta para completar esas metas',summary.goals.remaining]];
  return <View>
    <Text style={styles.cardText}>{summary.period.start} al {summary.period.end} · MXN</Text>
    <Text style={styles.previewSectionTitle}>Importes que se compartirán</Text>
    {rows.map(([label,value])=><View style={styles.previewRow} key={label}><Text style={styles.previewLabel}>{label}</Text><Text style={styles.previewValue}>{currency(value)}</Text></View>)}
    <Text style={styles.previewSectionTitle}>Gastos por categoría</Text>
    {summary.monthly.categories.length?summary.monthly.categories.map(item=><View key={item.category} style={styles.previewRow}><Text style={styles.previewLabel}>{item.category} · {item.percent}%</Text><Text style={styles.previewValue}>{currency(item.amount)}</Text></View>):<Text style={styles.cardText}>Sin gastos registrados en el periodo.</Text>}
    <Text style={styles.consentExplanation}>{summary.monthly.transactionCount} movimientos del periodo · {summary.cards.trackedCount} tarjetas con seguimiento · {summary.cards.untrackedReminderCount} recordatorios sin seguimiento de deuda · {summary.goals.activeCount} metas activas · {summary.goals.progressPercent}% de avance agregado.</Text>
    <Text style={styles.previewSectionTitle}>Cómo interpretar el resumen</Text>
    {summary.limitations.map(text=><Text key={text} style={styles.consentExplanation}>• {text}</Text>)}
  </View>;
}

// =====================================================
// TOOL CARD
// =====================================================

function ToolCard({ icon, title, text, onPress, accent = colors.primary, tint = colors.softBlue }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${title}`}
      style={[styles.toolCard,{borderColor:tint}]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.toolIcon,{backgroundColor:tint}]}>
        <Ionicons
          name={icon}
          size={23}
          color={accent}
        />
      </View>

      <Text style={styles.toolTitle}>
        {title}
      </Text>

      <Text style={styles.toolText}>
        {text}
      </Text>
      <View style={styles.openTool}><Text style={[styles.openToolText,{color:accent}]}>Abrir</Text><Ionicons name="arrow-forward" size={17} color={accent}/></View>
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
          color={colors.primary}
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
  analyzeButton: {flex:1.1,minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:10,paddingVertical:8,borderRadius:12,backgroundColor:colors.primary},
  analyzeButtonText: {color:'#FFFFFF',fontSize:12,fontWeight:'700',flexShrink:1},
  summaryBadge: {flexDirection:'row',alignItems:'center',gap:8,padding:12,backgroundColor:'#EAF7EF',borderRadius:14,marginBottom:14},
  summaryBadgeTitle: {color:'#157347',fontSize:12,fontWeight:'600',marginBottom:4},
  summaryModalHeader: {paddingHorizontal:18,paddingTop:8,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  summaryClose: {width:44,height:44,alignItems:'center',justifyContent:'center'},
  previewSectionTitle: {color:colors.ink,fontSize:16,fontWeight:'700',marginTop:20,marginBottom:10},
  previewRow: {flexDirection:'row',gap:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border},
  previewLabel: {flex:1,color:colors.muted,fontSize:13,lineHeight:19},
  previewValue: {color:colors.ink,fontSize:14,fontWeight:'600',maxWidth:'48%'},
  consentExplanation: {color:colors.muted,fontSize:12,lineHeight:19,marginTop:12},
  consentFooter: {paddingHorizontal:18,paddingTop:12,paddingBottom:8,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.surface},
  consentPrimary: {minHeight:48,borderRadius:14,backgroundColor:colors.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  summaryCancel: {minHeight:44,alignItems:'center',justifyContent:'center'},

  sectionSwitch: {flexDirection:'row',gap:10,marginBottom:10},
  sectionOption: {flex:1,minWidth:0,minHeight:66,padding:11,flexDirection:'row',alignItems:'center',gap:8,borderRadius:15,borderWidth:1,borderColor:colors.headerBorder,backgroundColor:colors.softBlue},
  sectionOptionActive: {backgroundColor:colors.primary,borderColor:colors.primary},
  sectionOptionTitle: {color:colors.ink,fontSize:14,fontWeight:'700'},
  sectionOptionTitleActive: {color:'#FFFFFF'},
  sectionOptionHint: {color:colors.muted,fontSize:10,lineHeight:15,marginTop:3},
  sectionOptionHintActive: {color:'#E2EDFF'},
  toolsHeading: {color:colors.ink,fontSize:21,fontWeight:'700',marginTop:8,marginBottom:8},
  toolsDescription: {color:colors.muted,fontSize:14,lineHeight:21,marginBottom:20},
  openTool: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:16},
  openToolText: {fontSize:12,fontWeight:'700'},

  chatHeader: {paddingHorizontal:layout.screenPadding,paddingTop:layout.screenPadding},
  chatToolbar: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:0,marginBottom:8},
  newChatButton: {flexDirection:'row',gap:6,alignItems:'center',minHeight:44,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:colors.headerBorder,backgroundColor:colors.surface},
  chatContent: {padding:layout.screenPadding,paddingTop:6,paddingBottom:20},
  welcomeCard: {backgroundColor:colors.surface,borderRadius:20,padding:20,marginBottom:12},
  welcomeIcon: {width:52,height:52,borderRadius:17,backgroundColor:colors.softBlue,alignItems:'center',justifyContent:'center',marginBottom:16},
  welcomeTitle: {color:colors.ink,fontSize:22,fontWeight:'700',lineHeight:29,marginBottom:10},
  welcomeSuggestions: {flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16},
  chatBubble: {borderRadius:18,padding:16,marginBottom:14,maxWidth:'94%'},
  userBubble: {alignSelf:'flex-end',backgroundColor:colors.primary,borderBottomRightRadius:5},
  assistantBubble: {alignSelf:'flex-start',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderBottomLeftRadius:5},
  bubbleAuthor: {fontSize:11,fontWeight:'700',color:colors.primary,marginBottom:7},
  bubbleText: {fontSize:15,lineHeight:23,color:colors.ink},
  outgoingStatus: {fontSize:11,lineHeight:17,color:'#FFFFFF',marginTop:8},
  thinkingRow: {flexDirection:'row',alignItems:'center',gap:10,padding:14},
  composer: {backgroundColor:colors.surface,borderTopWidth:1,borderTopColor:colors.border,paddingHorizontal:layout.screenPadding,paddingBottom:10,paddingTop:2},
  composerInfo: {flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  composerPrivacy: {fontSize:11,lineHeight:16,color:colors.muted,marginBottom:10},
  composerRow: {flexDirection:'row',alignItems:'flex-end',gap:10},
  composerInput: {flex:1,minHeight:48,maxHeight:120,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background,paddingHorizontal:14,paddingTop:14,paddingBottom:14,color:colors.ink,fontSize:15,textAlignVertical:'top'},
  sendChatButton: {width:48,height:48,borderRadius:15,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  composerHint: {fontSize:10,color:colors.muted,marginTop:7},

  assistantBadges: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:14 },
  assistantBadge: { flexDirection:'row', alignItems:'center', gap:5, padding:8, borderRadius:10, backgroundColor:colors.softBlue },
  assistantBadgeText: { fontSize:11, fontWeight:'600', color:colors.primary },
  aboutButton: { minHeight:44, flexDirection:'row', alignItems:'center', gap:4 },
  aboutButtonText: { fontSize:11, color:colors.muted },
  privacyToggle: { flexDirection:'row', alignItems:'center', gap:7, minHeight:44, marginTop:4 },
  characterCount: { fontSize:11, color:colors.muted, textAlign:'right', marginTop:-8, marginBottom:12 },
  sendLabel: { flexDirection:'row', alignItems:'center', gap:10 },
  responseAction: { minHeight:44, justifyContent:'center', alignItems:'flex-start' },
  failureCard: { padding:14, borderWidth:1, borderColor:'#F2C4C9', backgroundColor:'#FFF0F0', borderRadius:15, marginTop:16 },
  failureHeading: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  failureTitle: { flex:1, color:'#B42332', fontSize:14, fontWeight:'700' },
  failureText: { color:colors.ink, fontSize:13, lineHeight:20 },
  retryButton: { minHeight:44, paddingHorizontal:12, borderWidth:1, borderColor:colors.headerBorder, backgroundColor:colors.surface, borderRadius:12, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginTop:12 },

  suggestions: { flexDirection:'row', gap:8, paddingVertical:8 },
  suggestion: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:12, paddingVertical:10, minHeight:44, justifyContent:'center', borderWidth:1, borderColor:colors.headerBorder, backgroundColor:colors.softBlue, borderRadius:12 },
  suggestionText: { fontSize:12, color:colors.primary, fontWeight:'600' },
  privacyNote: { fontSize:11, lineHeight:17, color:colors.muted, marginTop:12 },
  askedQuestion: { color:colors.ink, fontWeight:'600', fontSize:13, lineHeight:19, marginBottom:12 },

  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: layout.screenPadding,
    paddingBottom: 28,
  },





  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 8,
  },

  heroText: {
    color: '#DCEEFF',
    fontSize: 15,
    lineHeight: 21,
  },

  assistantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
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
    backgroundColor: colors.background,
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
    color: colors.ink,
    paddingVertical: 14,
    minHeight: 100,
    maxHeight: 180,
  },

  primaryButton: {
    backgroundColor: colors.ink,
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.ink,
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
    backgroundColor: colors.softBlue,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
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
    marginBottom: 18,
  },

  toolCard: {
    borderWidth: 1,
    minHeight: 185,
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },

  toolText: {
    fontSize: 13,
    color: colors.muted,
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
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },

  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: 'row',
  },

  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.softBlue,
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
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },

  level: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.softBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  lessonDescription: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
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