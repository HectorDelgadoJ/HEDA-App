import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>

      <View style={styles.profileHeader}>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            H
          </Text>
        </View>

        <Text style={styles.userName}>
          Héctor Delgado
        </Text>

        <Text style={styles.userEmail}>
          hector@email.com
        </Text>

      </View>

      <View style={styles.sectionCard}>

        <Text style={styles.sectionTitle}>
          Información financiera
        </Text>

        <Text style={styles.option}>
          • Nivel financiero: Intermedio
        </Text>

        <Text style={styles.option}>
          • Metas activas: 3
        </Text>

        <Text style={styles.option}>
          • Presupuesto mensual: $15,000 MXN
        </Text>

      </View>

      <View style={styles.sectionCard}>

        <Text style={styles.sectionTitle}>
          Configuración
        </Text>

        <Text style={styles.option}>
          • Notificaciones
        </Text>

        <Text style={styles.option}>
          • Seguridad
        </Text>

        <Text style={styles.option}>
          • Métodos de pago
        </Text>

        <Text style={styles.option}>
          • Preferencias de IA
        </Text>

      </View>

      <View style={styles.aiCard}>

        <Text style={styles.aiTitle}>
          Asistente Inteligente
        </Text>

        <Text style={styles.aiText}>
          La IA de HEDA personaliza recomendaciones financieras según tus hábitos y objetivos.
        </Text>

      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Editar perfil
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>
          Cerrar sesión
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    padding: 20,
    paddingTop: 70,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  avatarText: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
  },

  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#001F54',
  },

  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },

  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 15,
  },

  option: {
    fontSize: 16,
    color: '#444',
    marginBottom: 12,
  },

  aiCard: {
    backgroundColor: '#001F54',
    borderRadius: 20,
    padding: 22,
    marginBottom: 25,
  },

  aiTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  aiText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
  },

  button: {
    backgroundColor: '#0A84FF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  logoutButton: {
    backgroundColor: '#D9534F',
    padding: 18,
    borderRadius: 15,
    marginBottom: 40,
  },

  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

});