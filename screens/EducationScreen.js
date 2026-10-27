import AsyncStorage from '@react-native-async-storage/async-storage';
import {savedChatsKey,readSavedChats,saveChatSlot} from '../utils/savedChats';
import {Text, TouchableOpacity, TextInput, Modal} from '../components/AccessiblePrimitives';
import AppActionCard from '../components/AppActionCard';
import {Alert} from '../services/alerts';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import InfoButton from '../components/InfoButton';
import { conversationHistory, beginChatTurn } from '../utils/aiConversation';
import { supabase } from '../services/supabase';
import SearchAttribution from '../components/SearchAttribution';
import { layout } from '../theme/layout';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import React, { useEffect, useRef, useState } from 'react';
import {View, StyleSheet, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Linking} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { previewHedaFinances, sendMessageToHedaAI } from '../services/hedaAI';

export default function EducationScreen({ navigation, route }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [failure, setFailure] = useState(null);
  const [appConsent,setAppConsent]=useState(false);
  const [savedChats,setSavedChats]=useState([]),[chatsOpen,setChatsOpen]=useState(false),[chatBusy,setChatBusy]=useState(false);
  const savedRef=useRef([]),chatId=useRef(null),saveLock=useRef(false);
  async function loadChats(id){
    try{const raw=id?await AsyncStorage.getItem(savedChatsKey(id)):null;if(ownerRef.current!==id)return;const chats=readSavedChats(raw,id);savedRef.current=chats;setSavedChats(chats);}catch{Alert.alert('Chats guardados','No pudimos leer los chats de este dispositivo.');}
  }
  async function persistChats(next){
    const id=ownerRef.current;if(!id)throw new Error('Vuelve a iniciar sesión.');
    const {data:{session}}=await supabase.auth.getSession();if(session?.user?.id!==id)throw new Error('Tu sesión cambió.');
    await AsyncStorage.setItem(savedChatsKey(id),JSON.stringify({version:1,owner:id,chats:next}));
    if(ownerRef.current===id){savedRef.current=next;setSavedChats(next);}
  }
  async function saveCurrent(){if(saveLock.current)return;saveLock.current=true;setChatBusy(true);try{const id=chatId.current||`chat-${Date.now()}`;await persistChats(saveChatSlot(savedRef.current,messagesRef.current,id));chatId.current=id;Alert.alert('Chat guardado','Disponible en este dispositivo. Vuelve a guardar si agregas más mensajes.');}catch(e){Alert.alert('No se guardó el chat',e.message);}finally{saveLock.current=false;setChatBusy(false);}}
  function openSaved(chat){resetChat();chatId.current=chat.id;commit(chat.messages);setChatsOpen(false);}
  function removeSaved(chat){Alert.alert('Borrar chat guardado','Se borrará la copia guardada en este dispositivo. No elimina registros del proveedor.',[{text:'Cancelar',style:'cancel'},{text:'Borrar',style:'destructive',onPress:async()=>{if(saveLock.current)return;saveLock.current=true;setChatBusy(true);try{await persistChats(savedRef.current.filter(c=>c.id!==chat.id));if(chatId.current===chat.id)chatId.current=null;}catch(e){Alert.alert('No se pudo borrar',e.message);}finally{saveLock.current=false;setChatBusy(false);}}}]);}
  const [actionsOpen, setActionsOpen] = useState(false);
  useEffect(()=>{if(route?.params?.openChat){setActionsOpen(false);navigation.setParams({openChat:undefined});}},[route?.params?.openChat,navigation]);
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

  function commit(next) {messagesRef.current = next;setMessages(next);}
  function resetChat() {
    chatId.current=null;
    generation.current++;
    requestRef.current?.abort();
    requestRef.current = null;
    setActionsOpen(false);
    commit([]);setQuestion('');setFailure(null);setLoadingAI(false);
    setAppConsent(false);setFinancialContext(null);setFinancialPreview(null);setSummaryLoading(false);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id || null;
      if (event === 'SIGNED_OUT' || ownerRef.current && ownerRef.current !== id) resetChat();
      if(ownerRef.current!==id){savedRef.current=[];setSavedChats([]);setChatsOpen(false);}
      ownerRef.current = id;void loadChats(id);
    });
    void supabase.auth.getSession().then(({data:{session}})=>{if(!ownerRef.current){ownerRef.current=session?.user?.id||null;void loadChats(ownerRef.current);}});
    return () => {generation.current++;requestRef.current?.abort();subscription.unsubscribe();};
  }, []);

  function newConversation() {
    if (!messagesRef.current.length && !question.trim() && !financialContext && !appConsent && !requestRef.current) return;
    Alert.alert('Nueva conversación', 'Se vaciará el chat abierto y se retirará su permiso para consultar datos. Los chats que guardaste seguirán disponibles en este dispositivo.', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Empezar de nuevo', onPress: resetChat }]
    );
  }

  async function openFinancialPreview() {
    if (requestRef.current) {Alert.alert('Consulta en curso','Espera a que termine la respuesta para preparar el análisis.');return;}
    setActionsOpen(false);setFinancialPreview(null);
    const requestGeneration = generation.current;
    const controller = new AbortController();
    requestRef.current = controller;setSummaryLoading(true);Keyboard.dismiss();
    try {
      const preview = await previewHedaFinances({ signal: controller.signal });
      if (generation.current === requestGeneration) setFinancialPreview(preview);
    } catch (error) {
      if (generation.current === requestGeneration) Alert.alert('No pudimos preparar el resumen', error?.message || 'Inténtalo de nuevo.');
    } finally {
      if (generation.current === requestGeneration) {requestRef.current = null;setSummaryLoading(false);}
    }
  }
  function approveFinancialPreview() {
    if (!financialPreview?.summary.monthly.transactionCount || requestRef.current) return;
    const approved = financialPreview;
    resetChat();setFinancialContext(approved);
    send('Analiza el resumen de mis registros de este mes. Explica mis principales gastos, cómo afectan mis tarjetas al saldo y qué pasos de ahorro podría considerar sin asumir gastos o ingresos que no registré.', approved);
  }

  function authorizeAppData(retryText){
    Alert.alert('Consultar mis datos en este chat','Gemini podrá recibir tu nombre y @usuario, edad calculada, ocupación, preferencias básicas, importes, categorías, fechas, nombres de tarjetas y metas, presupuestos y recurrentes de esta cuenta. No se envían correo, fecha de nacimiento ni notas de movimientos. La cuota gratuita puede usar el contenido para mejorar productos. No se consultará internet. Cada cambio requiere Confirmar y guardar. Nueva conversación deja de compartir los datos.',[{text:'Cancelar',style:'cancel'},{text:'Permitir en este chat',onPress:()=>{setAppConsent(true);setFinancialContext(null);if(retryText)void send(retryText,null,true);}}]);
  }

  async function send(overrideText, approvedSummary = financialContext, consentOverride = appConsent) {
    setActionsOpen(false);
    const text = typeof overrideText === 'string' ? overrideText : question.trim();
    if (!text || requestRef.current) return;
    const turn = ++sequence.current;
    const userId = `user-${turn}`;
    const requestGeneration = generation.current;
    const history = conversationHistory(messagesRef.current);
    const controller = new AbortController();
    requestRef.current = controller;
    commit(beginChatTurn(messagesRef.current, text, userId));
    setQuestion(text);setFailure(null);setLoadingAI(true);Keyboard.dismiss();scrollToLatest.current = true;
    try {
      const result = await sendMessageToHedaAI(text, history, { signal: controller.signal, summaryDigest: approvedSummary?.summaryDigest, appConsent:consentOverride });
      if (generation.current !== requestGeneration) return;
      commit([...messagesRef.current.map((item) => item.id === userId ? { ...item, status: 'complete' } : item), {
        id: `assistant-${turn}`, role: 'assistant', status: 'complete', text: result.message,
        sources: Array.isArray(result.sources) ? result.sources.filter((item) => typeof item.url === 'string' && item.url.startsWith('https://')) : [],
        proposals: Array.isArray(result.proposals)?result.proposals:[], appDataUsed:result.appDataUsed===true, needsAppConsent:result.needsAppConsent===true, originalQuestion:text, ownerId:ownerRef.current,
        searchHtml: typeof result.searchHtml === 'string' ? result.searchHtml : '', webEnabled: result.webEnabled === true, financialSummaryUsed: result.financialSummaryUsed === true
      }]);
      setQuestion('');scrollToLatest.current = true;
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      commit(messagesRef.current.map((item) => item.id === userId ? { ...item, status: 'failed' } : item));
      setFailure({ code: error?.code || '', message: error?.message || 'No pudimos responder. Inténtalo de nuevo.' });
      scrollToLatest.current = true;
    } finally {
      if (generation.current === requestGeneration) {requestRef.current = null;setLoadingAI(false);}
    }
  }

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <KeyboardAvoidingView style={themeStyle({ flex: 1 }, colors)} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.cleanHeader}>
        <View style={styles.headerSparkle}><Ionicons accessible={false} name="sparkles" size={22} color={colors.link}/></View>
        <Text accessibilityRole="header" style={styles.cleanTitle}>Asistente HEDA</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={"Chats guardados, "+savedChats.length+" de 2"} style={styles.headerBack} onPress={()=>{Keyboard.dismiss();setActionsOpen(false);setChatsOpen(true);}}><Ionicons accessible={false} name="chatbubbles-outline" size={23} color={colors.link}/><Text style={{color:colors.link,fontSize:12}}>{savedChats.length}/2</Text></TouchableOpacity>
      </View>
      <View style={themeStyle({ flex: 1, display: 'flex' }, colors)}>
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {if (scrollToLatest.current) {scrollRef.current?.scrollToEnd({ animated: true });scrollToLatest.current = false;}}}>
        {!financialContext&&<TouchableOpacity accessibilityRole="button" disabled={loadingAI||summaryLoading} onPress={()=>authorizeAppData(question.trim()||undefined)} style={{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderRadius:16,backgroundColor:colors.softBlue,marginBottom:14}}><Ionicons accessible={false} name={appConsent?'checkmark-circle-outline':'wallet-outline'} size={22} color={colors.link}/><View style={{flex:1}}><Text style={{color:colors.ink,fontWeight:'700',fontSize:15}}>{appConsent?'Tus registros están conectados':'Responde con mis datos'}</Text><Text style={{color:colors.muted,fontSize:13,lineHeight:19}}>{appConsent?'Puedes preguntar por tu saldo, gastos o metas.':'Permite consultar tu cuenta en este chat.'}</Text></View></TouchableOpacity>}
        {financialContext && <View style={styles.summaryBadge}><Ionicons accessible={false} name="checkmark-circle-outline" size={19} color={themeColor("#157347", colors)} /><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.summaryBadgeTitle}>Resumen compartido en este chat</Text><Text style={styles.aboutButtonText}>Hasta {financialContext.summary.period.end} · Sin búsqueda web</Text></View><TouchableOpacity accessibilityRole="button" style={styles.aboutButton} onPress={() => setFinancialPreview(financialContext)}><Text style={styles.suggestionText}>Ver</Text></TouchableOpacity></View>}
        {!messages.length && <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeading}><View style={styles.welcomeIcon}><Ionicons accessible={false} name="sparkles" size={23} color={themeColor(colors.primary, colors)} /></View><Text style={styles.welcomeTitle}>¿Qué quieres entender de tu dinero?</Text></View>
          <View style={styles.welcomeSuggestions}>{[['Ahorrar', '¿Cómo empiezo a ahorrar?'], ['Organizar gastos', '¿Cómo organizo mis gastos?'], ['Entender mi tarjeta', '¿Cómo funciona el pago de una tarjeta?']].map(([label, text]) => <TouchableOpacity key={label} accessibilityRole="button" style={styles.quietSuggestion} onPress={() => {setQuestion(text);inputRef.current?.focus();}}><Text style={styles.quietSuggestionText}>{label}</Text><Ionicons accessible={false} name="add" size={15} color={themeColor(colors.primary, colors)} /></TouchableOpacity>)}</View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Analizar mis finanzas" style={styles.exploreLink} disabled={loadingAI||summaryLoading} onPress={openFinancialPreview}><Ionicons accessible={false} name="pie-chart-outline" size={25} color="#FFFFFF"/><View style={{flex:1}}><Text style={styles.exploreText}>Analizar mis finanzas</Text><Text style={styles.exploreSubtitle}>Revisa tu resumen antes de compartirlo</Text></View></TouchableOpacity>
        </View>}
        {messages.map((item) => <View key={item.id} style={themeStyle([styles.chatBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble], colors)}>
          <Text style={themeStyle([styles.bubbleAuthor, item.role === 'user' && { color: '#E2EDFF' }], colors)}>{item.role === 'user' ? 'Tú' : 'HEDA'}</Text>
          <Text selectable style={themeStyle([styles.bubbleText, item.role === 'user' && { color: '#FFFFFF' }], colors)}>{item.text}</Text>
          {item.role==='assistant'&&item.appDataUsed&&<Text style={styles.composerHint}>Consultó tus datos autorizados · Sin internet</Text>}
          {item.role==='assistant'&&item.needsAppConsent&&<TouchableOpacity accessibilityRole="button" style={styles.retryButton} disabled={loadingAI} onPress={()=>authorizeAppData(item.originalQuestion)}><Text style={styles.suggestionText}>Permitir consultar mis datos</Text></TouchableOpacity>}
          {item.role==='assistant'&&(item.proposals||[]).map(proposal=><AppActionCard key={proposal.id} proposal={proposal} ownerId={item.ownerId}/>)}
          {item.status === 'failed' && <Text style={styles.outgoingStatus}>Sin respuesta · Puedes editar y reintentar abajo</Text>}
          {item.role === 'assistant' && <>
            {item.financialSummaryUsed ? <InfoButton title={"Contexto de esta respuesta"} text={"Basado en el resumen autorizado. No consulta internet. Inicia una conversación nueva para dejar de compartir el resumen."} /> : item.webEnabled === false && <InfoButton title={"Fuentes de esta respuesta"} text={"Sin búsqueda web. Esta respuesta no verifica cotizaciones, tasas o noticias actuales."} />}
            <SearchAttribution html={item.searchHtml} />
            {item.sources.length > 0 && <View style={themeStyle({ marginTop: 10 }, colors)}><Text style={styles.suggestionText}>Fuentes consultadas</Text>{item.sources.map((source, index) => <TouchableOpacity key={source.url} accessibilityRole="link" style={styles.responseAction} onPress={() => Linking.openURL(source.url).catch(() => Alert.alert('Fuente', 'No pudimos abrir este enlace.'))}><Text style={styles.suggestionText}>{index + 1}. {source.title || source.url}</Text></TouchableOpacity>)}</View>}
          </>}
        </View>)}
        {loadingAI && <View accessibilityLiveRegion="polite" style={styles.thinkingRow}><ActivityIndicator size="small" color={themeColor(colors.primary, colors)} /><Text style={styles.cardText}>HEDA está escribiendo…</Text></View>}
        {failure && <View accessibilityLiveRegion="polite" style={styles.failureCard}>
          <Text style={styles.failureTitle}>{failure.code === 'AI_RATE_LIMIT' ? 'Límite de consultas alcanzado' : ['AI_USER_DAILY_LIMIT','AI_USER_MINUTE_LIMIT','AI_GLOBAL_LIMIT'].includes(failure.code) ? 'Límite de uso de HEDA' : 'No pudimos responder'}</Text>
          <Text style={styles.failureText}>{failure.code === 'AI_RATE_LIMIT' ? 'Tu pregunta sigue escrita. El límite puede ser temporal o requerir revisar la cuota del proyecto. Inténtalo más tarde.' : failure.message}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton} disabled={loadingAI || summaryLoading || !question.trim()} onPress={failure.code === 'SUMMARY_CHANGED' ? openFinancialPreview : send}><Ionicons accessible={false} name="refresh-outline" size={16} color={themeColor(colors.primary, colors)} /><Text style={styles.suggestionText}>{failure.code === 'SUMMARY_CHANGED' ? 'Revisar resumen actualizado' : 'Reintentar'}</Text></TouchableOpacity>
        </View>}
      </ScrollView>
      <View style={styles.composer}>
        {summaryLoading ? <View accessibilityLiveRegion="polite" style={styles.thinkingRow}><ActivityIndicator size="small" color={themeColor(colors.primary, colors)} /><Text style={styles.cardText}>Preparando tu resumen para revisar…</Text></View> : null}
        {actionsOpen ? <View style={styles.actionMenu}>
          <TouchableOpacity accessibilityRole="button" style={styles.menuAction} disabled={loadingAI||summaryLoading} onPress={()=>{setActionsOpen(false);authorizeAppData();}}><Ionicons accessible={false} name="shield-checkmark-outline" size={22} color={colors.link}/><Text style={styles.menuText}>{appConsent?'Datos autorizados en este chat':'Consultar mis datos'}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.menuAction} onPress={() => {setActionsOpen(false);newConversation();}}><Ionicons accessible={false} name="add-circle-outline" size={22} color={themeColor(colors.primary, colors)} /><Text style={styles.menuText}>Nueva conversación</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loadingAI || summaryLoading }} disabled={loadingAI || summaryLoading} style={themeStyle([styles.menuAction, (loadingAI || summaryLoading) && { opacity: 0.45 }], colors)} onPress={() => {setActionsOpen(false);void openFinancialPreview();}}><Ionicons accessible={false} name="pie-chart-outline" size={22} color={themeColor(colors.primary, colors)} /><Text style={styles.menuText}>Analizar mis finanzas</Text></TouchableOpacity>

        </View> : null}
        <View style={styles.composerRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={actionsOpen ? 'Cerrar acciones del asistente' : 'Abrir acciones del asistente'} accessibilityState={{ expanded: actionsOpen }} style={themeStyle([styles.plusButton, actionsOpen && styles.plusButtonActive], colors)} onPress={() => {Keyboard.dismiss();setActionsOpen(!actionsOpen);}}><Ionicons accessible={false} name={actionsOpen ? 'close' : 'add'} size={26} color={themeColor(colors.primary, colors)} /></TouchableOpacity>
          <TextInput selectionColor={colors.link} cursorColor={colors.link} ref={inputRef} value={question} onChangeText={setQuestion} placeholder={messages.length ? 'Pregunta algo más…' : 'Escribe tu pregunta…'} placeholderTextColor={colors.placeholder} multiline maxLength={2000} editable={!loadingAI && !summaryLoading} accessibilityLabel="Mensaje para HEDA" onFocus={() => setActionsOpen(false)} style={styles.composerInput} keyboardAppearance={colors.dark ? "dark" : "light"} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={failure ? 'Reintentar mensaje' : 'Enviar mensaje'} disabled={loadingAI || summaryLoading || !question.trim()} onPress={send} style={themeStyle([styles.sendChatButton, (loadingAI || !question.trim()) && { opacity: 0.45 }], colors)}>{loadingAI || summaryLoading ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} size="small" /> : <Ionicons accessible={false} name="arrow-up" size={23} color={themeColor("#FFFFFF", colors)} />}</TouchableOpacity>
        </View>
        <View style={styles.composerFooter}><Text style={styles.composerHint}>{question.length}/2000</Text><InfoButton title={"Privacidad, contexto y límites de IA"} text={"Se envían tu pregunta y mensajes recientes de este chat a Google Gemini; el nivel gratuito puede usar el contenido para mejorar productos. No compartas datos sensibles. Puedes guardar hasta dos chats en este dispositivo. Contienen los mensajes, que pueden incluir información financiera; no se sincronizan con otros dispositivos. Bórralos desde Chats guardados si compartes el equipo. Los permisos y las propuestas para modificar registros no se guardan. Consultar mis datos permite compartir registros de esta cuenta durante el chat, sin correo, fecha de nacimiento ni notas. Analizar mis finanzas comparte solo el resumen que revisas. Las propuestas se guardan únicamente al confirmar. Nueva conversación deja de compartirlo. El uso tiene límites compartidos del proyecto; HEDA informa si se alcanza uno, pero no conoce la cuota restante en tiempo real."} style={themeStyle({ width: 44, height: 44 }, colors)} /></View>
      </View>
      </View>
      <Modal visible={chatsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setChatsOpen(false)}><SafeAreaProvider><SafeAreaView edges={['top','bottom','left','right']} style={styles.safe}><View style={styles.summaryModalHeader}><Text accessibilityRole="header" style={styles.toolsHeading}>Chats guardados · {savedChats.length}/2</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar chats guardados" style={styles.summaryClose} onPress={()=>setChatsOpen(false)}><Ionicons accessible={false} name="close" size={25} color={colors.ink}/></TouchableOpacity></View><ScrollView contentContainerStyle={{padding:18,gap:14}}><Text style={styles.cardText}>Guarda hasta dos conversaciones en este dispositivo, con sus últimas 20 preguntas y respuestas. Solo se conserva el texto; al abrirlas tendrás que autorizar otra vez la consulta de tus datos.</Text><TouchableOpacity accessibilityRole="button" disabled={chatBusy||loadingAI||summaryLoading||!messages.length} onPress={saveCurrent} style={[styles.consentPrimary,{opacity:chatBusy||loadingAI||summaryLoading||!messages.length?0.5:1}]}><Text style={styles.analyzeButtonText}>{chatBusy?'Guardando…':chatId.current?'Actualizar este chat guardado':'Guardar conversación actual'}</Text></TouchableOpacity>{!savedChats.length&&<Text style={styles.cardText}>Todavía no has guardado chats.</Text>}{savedChats.map(chat=><View key={chat.id} style={{padding:16,gap:12,borderWidth:1,borderColor:colors.border,borderRadius:16}}><Text style={styles.summaryBadgeTitle}>{chat.title}</Text><Text style={styles.cardText}>{chat.messages.length/2} preguntas guardadas</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={'Abrir chat: '+chat.title} disabled={chatBusy} style={styles.retryButton} onPress={()=>{if(messages.length||question.trim())Alert.alert('Abrir chat guardado','Los cambios sin guardar del chat abierto se perderán.',[{text:'Cancelar',style:'cancel'},{text:'Abrir',onPress:()=>openSaved(chat)}]);else openSaved(chat);}}><Text style={styles.suggestionText}>Abrir conversación</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={'Borrar chat: '+chat.title} disabled={chatBusy} style={styles.retryButton} onPress={()=>removeSaved(chat)}><Text style={{color:colors.expense,fontWeight:'700'}}>Borrar</Text></TouchableOpacity></View>)}</ScrollView></SafeAreaView></SafeAreaProvider></Modal>
      <Modal visible={!!financialPreview} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFinancialPreview(null)}>
        <SafeAreaProvider><SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
          <View style={styles.summaryModalHeader}><Text accessibilityRole="header" style={styles.toolsHeading}>Revisa tu resumen</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar resumen sin compartir" style={styles.summaryClose} onPress={() => setFinancialPreview(null)}><Ionicons accessible={false} name="close" size={25} color={themeColor(colors.ink, colors)} /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 0 }}>
            {financialPreview && <FinancialSummaryPreview summary={financialPreview.summary} />}
            <Text style={styles.consentExplanation}>Al continuar se vaciará el chat abierto sin guardar y enviarás estos importes a Google Gemini en un chat nuevo. Los chats guardados se conservarán. Los seguimientos usarán el mismo resumen mientras esté activo. En el nivel gratuito, Google puede usar el contenido para mejorar productos.</Text>
            <Text style={styles.consentExplanation}>No se envían nombres, correos, notas, identificadores ni nombres de tarjetas o metas. La búsqueda web estará desactivada en este chat. No se harán pagos. Cualquier propuesta para guardar datos requerirá una confirmación adicional.</Text>
          </ScrollView>
          <View style={styles.consentFooter}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Compartir y analizar" style={[styles.consentPrimary, financialPreview?.summary.monthly.transactionCount === 0 && {opacity:0.45}]} disabled={!financialPreview?.summary.monthly.transactionCount} onPress={approveFinancialPreview}><Text style={styles.analyzeButtonText}>Compartir y analizar</Text><Ionicons accessible={false} name="arrow-forward" size={18} color={themeColor("#FFFFFF", colors)} /></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.summaryCancel} onPress={() => setFinancialPreview(null)}><Text style={styles.suggestionText}>Cancelar · No compartir</Text></TouchableOpacity></View>
        </SafeAreaView></SafeAreaProvider>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function FinancialSummaryPreview({ summary }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const currency = (value) => '$' + Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = [['Saldo registrado disponible', summary.availableBalance], ['Ingresos del periodo', summary.monthly.income], ['Gastos del periodo', summary.monthly.expenses], ['Ingresos menos gastos', summary.monthly.result], ['Cambio del saldo en el periodo', summary.monthly.cashChange], ['Pagos de tarjetas (sin duplicar gastos)', summary.monthly.cardPayments], ['Deuda de tarjetas con seguimiento', summary.cards.debt], ['Saldo a favor en tarjetas', summary.cards.credit], ['Avance acumulado en metas activas', summary.goals.saved], ['Objetivo total de metas activas', summary.goals.target], ['Falta para completar esas metas', summary.goals.remaining]];
  return <View>
    <Text style={styles.cardText}>{summary.period.start} al {summary.period.end} · MXN</Text>
    {summary.monthly.transactionCount === 0 ? <Text style={styles.consentExplanation}>Aún no hay movimientos de este mes para analizar. Puedes registrar uno en Movimientos o preguntar un concepto general en el chat.</Text> : summary.coverage?.sparseMonth ? <Text style={styles.consentExplanation}>Hay pocos registros este mes. HEDA podrá describirlos, pero no concluir que representan todos tus hábitos.</Text> : null}
    {summary.budgets && <Text style={styles.consentExplanation}>{summary.budgets.configuredCount} presupuestos configurados · {summary.budgets.nearCount} cerca del límite · {summary.budgets.reachedCount} con límite alcanzado o superado. Límites totales: {currency(summary.budgets.monthlyLimitTotal)}. Gastado en esas categorías: {currency(summary.budgets.spentInBudgetedCategories)}.</Text>}
    <Text style={styles.previewSectionTitle}>Importes que se compartirán</Text>
    {rows.map(([label, value]) => <View style={styles.previewRow} key={label}><Text style={styles.previewLabel}>{label}</Text><Text style={styles.previewValue}>{currency(value)}</Text></View>)}
    <Text style={styles.previewSectionTitle}>Gastos por categoría</Text>
    {summary.monthly.categories.length ? summary.monthly.categories.map((item) => <View key={item.category} style={styles.previewRow}><Text style={styles.previewLabel}>{item.category} · {item.percent}%</Text><Text style={styles.previewValue}>{currency(item.amount)}</Text></View>) : <Text style={styles.cardText}>Sin gastos registrados en el periodo.</Text>}
    <Text style={styles.consentExplanation}>{summary.monthly.transactionCount} movimientos del periodo · {summary.cards.trackedCount} tarjetas con seguimiento · {summary.cards.untrackedReminderCount} recordatorios sin seguimiento de deuda · {summary.goals.activeCount} metas activas · {summary.goals.progressPercent}% de avance agregado.</Text>
    <Text style={styles.previewSectionTitle}>Cómo interpretar el resumen</Text>
    {summary.limitations.map((text) => <Text key={text} style={styles.consentExplanation}>• {text}</Text>)}
  </View>;
}

const makeStyles = (colors) => StyleSheet.create({
  cleanHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  cleanTitle: { flex: 1, color: colors.ink, fontSize: 21, fontWeight: '700' },
  headerSparkle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.softBlue },
  headerBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  plusButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.softBlue },
  plusButtonActive: { borderWidth: 1, borderColor: colors.primary },
  actionMenu: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 6, marginBottom: 12, marginTop: 10 },
  menuAction: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 50, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { color: colors.ink, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  exploreLink: { alignSelf: 'flex-start', width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88, padding: 16, marginTop: 22, borderRadius: 18, backgroundColor: '#6D28D9' },
  exploreText: { color: '#FFFFFF', fontSize: 17, lineHeight: 23, fontWeight: '700', textAlign: 'left' },
  exploreSubtitle: { color: '#F3E8FF', fontSize: 13, lineHeight: 18, marginTop: 4, textAlign: 'left' },
  exploreIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  exploreMenuAction: { backgroundColor: '#F3E8FF', borderRadius: 13, marginTop: 4 },
  quietSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: colors.headerBorder, backgroundColor: colors.softBlue, borderRadius: 12 },
  quietSuggestionText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyzeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#EAF7EF', borderRadius: 14, marginBottom: 14 },
  summaryBadgeTitle: { color: '#157347', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryModalHeader: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  previewSectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  previewRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  previewLabel: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  previewValue: { color: colors.ink, fontSize: 14, fontWeight: '600', maxWidth: '48%' },
  consentExplanation: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 12 },
  consentFooter: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  consentPrimary: { minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  summaryCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  toolsHeading: { color: colors.ink, fontSize: 21, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  toolsDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  openTool: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  openToolText: { fontSize: 12, fontWeight: '700' },

  chatContent: { padding: layout.screenPadding, paddingTop: 6, paddingBottom: 20 },
  welcomeCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 12 },
  welcomeHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { flex: 1, color: colors.ink, fontSize: 19, fontWeight: '700', lineHeight: 26 },
  welcomeSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chatBubble: { borderRadius: 18, padding: 16, marginBottom: 14, maxWidth: '94%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  bubbleAuthor: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 7 },
  bubbleText: { fontSize: 15, lineHeight: 23, color: colors.ink },
  outgoingStatus: { fontSize: 11, lineHeight: 17, color: '#FFFFFF', marginTop: 8 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  composer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: layout.screenPadding, paddingBottom: 4, paddingTop: 10 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 15, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.input, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, color: colors.ink, fontSize: 15, textAlignVertical: 'top' },
  sendChatButton: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  composerHint: { fontSize: 10, color: colors.muted, marginTop: 7 },

  aboutButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  aboutButtonText: { fontSize: 11, color: colors.muted },
  responseAction: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  failureCard: { padding: 14, borderWidth: 1, borderColor: '#F2C4C9', backgroundColor: '#FFF0F0', borderRadius: 15, marginTop: 16 },
  failureTitle: { flex: 1, color: '#B42332', fontSize: 14, fontWeight: '700' },
  failureText: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  retryButton: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.headerBorder, backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },

  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.headerBorder, backgroundColor: colors.softBlue, borderRadius: 12 },
  suggestionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },

  container: {
    flex: 1,
    backgroundColor: colors.background
  },

  cardText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18
  },

  toolCard: {
    borderWidth: 1,
    minHeight: 185,
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2
  },

  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },

  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6
  },

  toolText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18
  }

});
