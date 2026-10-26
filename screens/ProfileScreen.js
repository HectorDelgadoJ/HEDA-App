import AdminEntry from '../components/AdminEntry';
import BirthDateField from '../components/BirthDateField';
import {displayBirthDate,ageFromBirthDate} from '../utils/birthDate';
import LegalLinks from '../components/LegalLinks';
import {Alert} from '../services/alerts';
import {useWebInstall} from '../components/WebInstallProvider';
import DeleteAccountPanel from '../components/DeleteAccountPanel';
import { authAutofillProps } from '../utils/authInput';
import { dismissAuthKeyboard } from '../services/keyboard';
import AuthCaptcha, { useAuthCaptcha } from '../components/AuthCaptcha';
import { isCustomizedExperience } from '../utils/experience';
import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import InfoButton from '../components/InfoButton';
import { useExperience } from '../components/ExperienceProvider';
import { supabase } from '../services/supabase';
import { saveOwnProfile, changeOwnPassword } from '../services/profileActions';
import { profileInitials, validateProfile, validatePassword } from '../utils/profile';
import { colors } from '../theme/colors';
const version = require('../package.json').version;
const information = {
  privacy: { title: 'Privacidad y datos', sections: [
    ['Tus registros', 'Los movimientos, tarjetas, programaciones, metas y presupuestos se guardan en Supabase asociados a tu cuenta. Las funciones de HEDA utilizan los registros que tú proporcionas; no se conectan a tu banco.'],
    ['Cuando usas IA', 'Tu pregunta y mensajes recientes del chat se envían a Google Gemini. Consultar mis datos permite compartir registros propios y datos básicos de perfil durante el chat, previa autorización; no se envían correo, fecha de nacimiento ni notas. Analizar mis finanzas comparte solo el resumen revisado. Las propuestas requieren confirmación para guardarse. En el nivel gratuito, Google puede usar el contenido para mejorar productos.'],
    ['Qué se conserva en el teléfono', 'El avance educativo y las alertas leídas se guardan por cuenta en este dispositivo. La conversación con IA se mantiene en memoria y se limpia al cerrar sesión o iniciar una nueva. Esto no elimina registros que conserven los proveedores.'],
    ['Fecha de nacimiento', 'Tu fecha queda privada y se usa para calcular la edad actual y comprobar la disponibilidad de Gemini. Puedes corregirla en Editar perfil; no se envía al modelo.'],
    ['Tus preferencias', 'La vista y la personalización se guardan en tu cuenta de Supabase Auth. Ocultar un bloque no elimina sus datos ni cambia tus cálculos.']]
  },
  help: { title: 'Ayuda rápida', sections: [
    ['¿Cómo registro un gasto?', 'Desde Inicio toca Registrar gasto. Escribe el monto, elige una categoría y guarda. En Movimientos puedes cambiar la fecha y abrir Más opciones para añadir una nota o elegir una tarjeta.'],
    ['¿Dónde encuentro tarjetas y pagos?', 'En Movimientos → Pagos o Programados. Tarjetas por pagar es opcional y se activa con su interruptor. Una compra con tarjeta cuenta como gasto; pagarla reduce saldo y deuda sin duplicar el gasto.'],
    ['¿Los recurrentes se registran solos?', 'No. Abre Programados y confirma únicamente cuando el pago, cargo o ingreso ya haya ocurrido. Marcar una alerta como leída no confirma un movimiento.'],
    ['¿Dónde están los presupuestos y metas?', 'Los presupuestos se administran en Alertas → Presupuestos. Las metas están en Reportes. Registrar progreso de una meta no realiza una transferencia bancaria.'],
    ['¿Cómo vuelvo a la vista simple?', 'Abre Personalizar HEDA en Perfil. Puedes elegir la vista y los bloques de Inicio; tus registros se conservan.'],
    ['¿Por qué no llega una notificación al celular?', 'Activa Recordarme en este teléfono en Alertas y permite las notificaciones. Los recordatorios locales se programan al abrir HEDA y no registran pagos. Usa Probar aviso para comprobar el permiso.']]
  },
  about: { title: 'Acerca de HEDA', sections: [
    ['HEDA', 'Aplicación académica para registrar, organizar y comprender las finanzas personales. Incluye educación financiera y un asistente de IA.'],
    ['Alcance actual', 'No realiza pagos ni se conecta a bancos. Las estimaciones dependen de lo que registres. La IA puede equivocarse y no toma decisiones por ti. El módulo de Ethereum clasifica tendencias con una LSTM experimental de desempeño bajo; muestra cierres diarios e identifica datos históricos sin actualización. No es asesoría de inversión.'],
    ['Versión', version]]
  }
};

export default function ProfileScreen({ navigation }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const captcha=useAuthCaptcha();
  const install=useWebInstall();
  const { simple, preferences, openSettings, openTour } = useExperience();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState({ full_name: '', username: '', occupation: '', birth_date:'' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirmation: '' });
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const request = useRef(0),active = useRef(false),busy = useRef(false),owner = useRef(null);

  const load = useCallback(async (refresh = false) => {
    const generation = ++request.current;
    if (refresh) setRefreshing(true);else setLoading(true);
    setError('');
    try {
      const result = await supabase.auth.getUser();
      if (!active.current || request.current !== generation) return;
      if (result.error || !result.data.user) throw new Error('No pudimos comprobar tu sesión. Vuelve a entrar.');
      const current = result.data.user;
      if (owner.current !== current.id) {setProfile(null);owner.current = current.id;}
      setUser(current);
      const response = await supabase.from('profiles').select('full_name,username,occupation,birth_date').eq('id', current.id).single();
      if (!active.current || request.current !== generation) return;
      if (response.error) throw new Error('No pudimos actualizar tu perfil. Desliza hacia abajo o toca Reintentar.');
      setProfile(response.data);
    } catch (failure) {if (active.current && request.current === generation) setError(failure.message || 'No pudimos cargar Perfil.');} finally
    {if (active.current && request.current === generation) {setLoading(false);setRefreshing(false);}}
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;void load();
    return () => {active.current = false;request.current++;setPanel(null);setDeleteOpen(false);setPasswords({ current: '', next: '', confirmation: '' });};
  }, [load]));

  function closePanel() {
    if (busy.current) return;
    Keyboard.dismiss();setPanel(null);setPasswords({ current: '', next: '', confirmation: '' });setVisiblePassword(false);setFormError('');setFields({});
  }
  function openPanel(name) {
    if (busy.current || logoutBusy) return;
    setFields({});setFormError('');setNotice('');setVisiblePassword(false);
    setPasswords({ current: '', next: '', confirmation: '' });
    if(name==='password' && Array.isArray(user?.app_metadata?.providers) && !user.app_metadata.providers.includes('email')){Alert.alert('Acceso con Google','Tu contraseña se administra con tu proveedor de acceso.');return;}
    captcha.reset();
    if (name === 'edit') setDraft({ full_name: profile?.full_name || '', username: profile?.username || '', occupation: profile?.occupation || '', birth_date:displayBirthDate(profile?.birth_date) });
    setPanel(name);
  }
  async function save() {
    if (busy.current || !user) return;
    let payload;
    if (panel === 'edit') {const validated = validateProfile(draft);setFields(validated.errors);if (Object.keys(validated.errors).length) return;payload = validated.payload;} else
    {const errors = validatePassword(passwords.current, passwords.next, passwords.confirmation);setFields(errors);if (Object.keys(errors).length) return;}
    busy.current = true;setSaving(true);setFormError('');
    const expectedOwner = user.id,expectedPanel = panel;
    try {
      if (expectedPanel === 'edit') {
        const saved = await saveOwnProfile(supabase, expectedOwner, payload);
        if (active.current && owner.current === expectedOwner) {setProfile(saved);setNotice('Tu perfil quedó actualizado.');}
      } else {
        if(captcha.required&&!captcha.token)throw new Error('Completa la verificación de seguridad.');
        try{await changeOwnPassword(supabase, expectedOwner, passwords.current, passwords.next,{captchaToken:captcha.token});}finally{captcha.reset();}
        if (active.current && owner.current === expectedOwner) setNotice('Tu contraseña quedó actualizada.');
      }
      if (active.current && owner.current === expectedOwner) {setPanel(null);setPasswords({ current: '', next: '', confirmation: '' });setVisiblePassword(false);}
    } catch (failure) {if (active.current && owner.current === expectedOwner) setFormError(failure.message || 'No se guardó el cambio. Reintenta.');} finally
    {busy.current = false;if (active.current) setSaving(false);}
  }
  function logout() {
    if (busy.current || logoutBusy) return;
    Alert.alert('Cerrar sesión', 'Se cerrará tu sesión en este dispositivo. Tus registros de cuenta se conservan.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', onPress: async () => {
        if (busy.current) return;
        busy.current = true;setLogoutBusy(true);setPasswords({ current: '', next: '', confirmation: '' });
        try {const result = await supabase.auth.signOut({ scope: 'local' });if (result.error) throw result.error;}
        catch {if (active.current) Alert.alert('No se cerró la sesión', 'Revisa tu conexión e inténtalo de nuevo.');} finally
        {busy.current = false;if (active.current) setLogoutBusy(false);}
      } }]);
  }
  const name = profile?.full_name || user?.user_metadata?.full_name || 'Tu perfil';
  const details = information[panel];
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {if (!busy.current) void load(true);}} tintColor={themeColor(colors.primary, colors)} />}>
      <AdminEntry navigation={navigation}/><ScreenHeader title="Perfil" subtitle="Tu cuenta y HEDA, a tu manera" icon="person-outline" />
      {error ? <View style={styles.errorBox}><Text style={styles.body}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => load()}><Text style={styles.link}>Reintentar</Text></TouchableOpacity></View> : null}
      <View style={styles.identity}><View style={styles.avatar}><Text style={styles.initials}>{profileInitials(name)}</Text></View><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.name}>{name}</Text><Text style={styles.email}>{user?.email || 'Cargando cuenta…'}</Text>{profile?.birth_date ? <Text style={styles.email}>{ageFromBirthDate(profile.birth_date)} años</Text> : null}{profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}</View></View>
      {loading ? <ActivityIndicator color={themeColor(colors.primary, colors)} style={themeStyle({ marginBottom: 18 }, colors)} /> : null}
      {notice ? <View accessibilityLiveRegion="polite" style={styles.success}><Ionicons name="checkmark-circle-outline" size={21} color={themeColor("#15803D", colors)} /><Text style={themeStyle([styles.body, { color: '#15803D', flex: 1 }], colors)}>{notice}</Text></View> : null}
      <TouchableOpacity accessibilityRole="button" style={styles.personalize} onPress={openSettings}><View style={styles.icon}><Ionicons name="options-outline" size={23} color={themeColor(colors.primary, colors)} /></View><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.rowTitle}>Personalizar HEDA</Text><Text style={styles.subtitle}>Vista {isCustomizedExperience(preferences) ? 'personalizada' : simple ? 'simple' : 'completa'} · Inicio y herramientas</Text></View><Ionicons name="chevron-forward" size={20} color={themeColor(colors.primary, colors)} /></TouchableOpacity>
      <Text style={styles.section}>Cuenta</Text><View style={styles.group}>
        <Option icon="person-outline" title="Editar perfil" text="Nombre, usuario y ocupación" disabled={!profile || loading} onPress={() => openPanel('edit')} />
        <Option icon="lock-closed-outline" title="Cambiar contraseña" text="Verifica tu contraseña actual" disabled={!user || loading} onPress={() => openPanel('password')} />
        <Option icon="notifications-outline" title="Alertas y presupuestos" text="Avisos y recordatorios del teléfono" last onPress={() => navigation.navigate('Alertas')} />
      </View>
      <Text style={styles.section}>Tu HEDA</Text><View style={styles.group}>
        {install.supported?<Option icon="phone-portrait-outline" title="Agregar HEDA a inicio" text="Guía para usarla como app" onPress={install.openGuide}/>:null}
        <Option icon="compass-outline" title="Ver visita guiada" text="Recorre las secciones de HEDA otra vez" onPress={openTour} />
        <Option icon="analytics-outline" title="Mis hábitos" text="Patrones de tus registros" onPress={() => navigation.navigate('Habitos')} />
        <Option icon="school-outline" title="Educación financiera" text="Lecciones y tu avance" last onPress={() => navigation.navigate('EducacionFinanciera')} />
      </View>
      <Text style={styles.section}>Ayuda y privacidad</Text><View style={styles.group}>
        <Option icon="shield-checkmark-outline" title="Privacidad y datos" onPress={() => openPanel('privacy')} /><LegalLinks/>
        <Option icon="help-circle-outline" title="Ayuda rápida" onPress={() => openPanel('help')} />
        <Option icon="information-circle-outline" title="Acerca de HEDA" last onPress={() => openPanel('about')} />
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: logoutBusy || saving }} disabled={logoutBusy || saving} onPress={logout} style={styles.logout}><Ionicons name="log-out-outline" size={21} color={themeColor("#B42332", colors)} /><Text style={styles.logoutText}>{logoutBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={!user||loading||saving||logoutBusy} onPress={()=>{dismissAuthKeyboard();setDeleteOpen(true);}} style={{minHeight:48,alignItems:'center',justifyContent:'center',marginTop:8}}><Text style={{color:colors.expense,fontSize:14,fontWeight:'600'}}>Eliminar cuenta</Text></TouchableOpacity>
      <Text style={styles.version}>HEDA · {version}</Text>
    </ScrollView>
    {deleteOpen&&user?<DeleteAccountPanel ownerId={user.id} email={user.email} onClose={()=>setDeleteOpen(false)}/>:null}
    <Modal visible={!!panel} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePanel}>
      <SafeAreaProvider><SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}><KeyboardAvoidingView style={themeStyle({ flex: 1 }, colors)} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}><Text accessibilityRole="header" style={styles.modalTitle}>{panel === 'edit' ? 'Editar perfil' : panel === 'password' ? 'Cambiar contraseña' : details?.title}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar formulario" hitSlop={8} style={styles.close} disabled={saving} onPress={closePanel}><Ionicons name="close" size={21} color={themeColor(colors.primary, colors)} /><Text style={styles.closeText}>Cerrar</Text></TouchableOpacity></View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {panel === 'edit' ? <>
            <Field label="Nombre completo" value={draft.full_name} onChangeText={(value) => setDraft((previous) => ({ ...previous, full_name: value }))} error={fields.full_name} maxLength={100} editable={!saving} autoComplete="name" />
            <BirthDateField value={draft.birth_date} onChangeText={value=>setDraft(previous=>({...previous,birth_date:value}))} editable={!saving} error={fields.birth_date}/>
            <Field label="Tu @usuario" value={draft.username} onChangeText={(value) => setDraft((previous) => ({ ...previous, username: value }))} error={fields.username} maxLength={30} editable={!saving} autoCapitalize="none" autoCorrect={false} />
            <Field label="Ocupación (opcional)" value={draft.occupation} onChangeText={(value) => setDraft((previous) => ({ ...previous, occupation: value }))} error={fields.occupation} maxLength={100} editable={!saving} />
            <View style={styles.emailRow}><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.label}>Correo de acceso</Text><Text selectable style={styles.body}>{user?.email}</Text></View><InfoButton title="Correo de acceso" text="Este formulario modifica tu perfil. El correo de inicio de sesión se conserva; su cambio todavía no está disponible aquí." /></View>
          </> : panel === 'password' ? <>
            <Field label="Contraseña actual" value={passwords.current} onChangeText={(value) => setPasswords((previous) => ({ ...previous, current: value }))} error={fields.current} maxLength={128} editable={!saving} secureTextEntry={!visiblePassword} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" />
            <Field label="Nueva contraseña" value={passwords.next} onChangeText={(value) => setPasswords((previous) => ({ ...previous, next: value }))} error={fields.next} maxLength={128} editable={!saving} secureTextEntry={!visiblePassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
            <Field label="Confirmar nueva contraseña" value={passwords.confirmation} onChangeText={(value) => setPasswords((previous) => ({ ...previous, confirmation: value }))} error={fields.confirmation} maxLength={128} editable={!saving} secureTextEntry={!visiblePassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: visiblePassword }} style={styles.retry} disabled={saving} onPress={() => {dismissAuthKeyboard();setVisiblePassword(!visiblePassword);}}><Ionicons name={visiblePassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={themeColor(colors.primary, colors)} /><Text style={styles.link}>{visiblePassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</Text></TouchableOpacity>
            <InfoButton title="Requisitos de contraseña" text="Utiliza entre 8 y 128 caracteres. Supabase puede aplicar requisitos adicionales. Las contraseñas se envían al servicio de autenticación; no se guardan en tu perfil ni se comparten con IA." />
          </> : details?.sections.map(([title, text]) => <View key={title} style={styles.infoSection}><Text style={styles.rowTitle}>{title}</Text><Text style={themeStyle([styles.body, { marginTop: 9 }], colors)}>{text}</Text></View>)}
          {panel==='password'?<AuthCaptcha captcha={captcha}/>:null}
            {formError ? <Text accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}
          {panel === 'edit' || panel === 'password' ? <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={themeStyle([styles.save, saving && { opacity: 0.5 }], colors)}>{saving ? <ActivityIndicator color={themeColor("#FFFFFF", colors)} /> : <Text style={styles.saveText}>{panel === 'edit' ? 'Guardar perfil' : 'Actualizar contraseña'}</Text>}</TouchableOpacity> : null}
        </ScrollView>
      </KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>
    </Modal>
  </SafeAreaView>;
}
function Field({ label, error, autoComplete, textContentType, ...props }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <View style={themeStyle({ marginBottom: 18 }, colors)}><Text style={styles.label}>{label}</Text><TextInput selectionColor={colors.link} cursorColor={colors.link} accessibilityLabel={label} placeholderTextColor={colors.placeholder} style={themeStyle([styles.input, error && { borderColor: '#B42332' }], colors)} {...props} {...authAutofillProps(Platform.OS,{password:props.secureTextEntry!==undefined,autoComplete,textContentType})} keyboardAppearance={colors.dark ? "dark" : "light"} />{error ? <Text accessibilityLiveRegion="polite" style={styles.formError}>{error}</Text> : null}</View>;
}
function Option({ icon, title, text, onPress, disabled, last }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={themeStyle([styles.option, !last && styles.divider, disabled && { opacity: 0.5 }], colors)}><View style={styles.icon}><Ionicons name={icon} size={22} color={themeColor(colors.primary, colors)} /></View><View style={themeStyle({ flex: 1 }, colors)}><Text style={styles.rowTitle}>{title}</Text>{text ? <Text style={styles.subtitle}>{text}</Text> : null}</View><Ionicons name="chevron-forward" size={18} color={themeColor(colors.muted, colors)} /></TouchableOpacity>;
}
const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 18, paddingBottom: 30 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.softBlue, padding: 18, borderRadius: 20, marginBottom: 18, borderWidth: 1, borderColor: colors.headerBorder },
  avatar: { width: 62, height: 62, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, fontSize: 23, fontWeight: '700' }, name: { color: colors.ink, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 20 }, username: { color: colors.primary, fontSize: 13, marginTop: 4, fontWeight: '600' },
  personalize: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.headerBorder, borderRadius: 18, marginBottom: 8 },
  section: { color: colors.ink, fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 12 }, group: { borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  option: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 72, paddingVertical: 14 }, divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 }, errorBox: { backgroundColor: '#FFF4E5', borderRadius: 14, padding: 14, marginBottom: 16 },
  retry: { flexDirection: 'row', gap: 8, minHeight: 46, alignItems: 'center', paddingVertical: 10 }, link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  success: { flexDirection: 'row', gap: 9, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 16 },
  logout: { minHeight: 50, marginTop: 24, borderRadius: 15, borderWidth: 1, borderColor: '#F2CDD1', backgroundColor: '#FFF0F1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, logoutText: { color: '#B42332', fontSize: 15, fontWeight: '600' }, version: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 20 },
  modalHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, modalTitle: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '700' }, close: { minWidth: 90, minHeight: 48, flexShrink: 0, flexDirection: 'row', gap: 5, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.softBlue },
  closeText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 9 }, input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, padding: 14, minHeight: 50, fontSize: 16, color: colors.ink },
  emailRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.softBlue, padding: 14, borderRadius: 14 }, formError: { color: '#B42332', fontSize: 13, lineHeight: 19, marginTop: 8 },
  save: { backgroundColor: colors.primary, minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 15, marginTop: 18 }, saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }, infoSection: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 17, marginBottom: 14 }
});
