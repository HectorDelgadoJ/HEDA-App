import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function QRScreen() {
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        Pagos con Código QR
      </Text>

      <Text style={styles.subtitle}>
        Realiza pagos digitales rápidos y seguros mediante códigos QR.
      </Text>

      <View style={styles.qrCard}>
        <Text style={styles.qrTitle}>
          Código QR Personal
        </Text>

        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrText}>
            QR
          </Text>
        </View>

        <Text style={styles.userName}>
          Héctor Delgado
        </Text>

        <Text style={styles.accountInfo}>
          Cuenta Digital HEDA
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Funciones disponibles
        </Text>

        <Text style={styles.option}>
          • Escanear código QR
        </Text>

        <Text style={styles.option}>
          • Generar código QR
        </Text>

        <Text style={styles.option}>
          • Historial de pagos
        </Text>

        <Text style={styles.option}>
          • Pagos rápidos entre usuarios
        </Text>
      </View>

      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>
          Seguridad
        </Text>

        <Text style={styles.securityText}>
          Todos los pagos son protegidos mediante autenticación segura y cifrado de datos.
        </Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Escanear QR
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>
          Generar QR
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

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 25,
  },

  qrCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  qrTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 20,
  },

  qrPlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: '#D9E6FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  qrText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#001F54',
  },

  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 5,
  },

  accountInfo: {
    color: '#666',
    fontSize: 15,
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

  securityCard: {
    backgroundColor: '#001F54',
    borderRadius: 20,
    padding: 22,
    marginBottom: 25,
  },

  securityTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  securityText: {
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

  secondaryButton: {
    backgroundColor: '#001F54',
    padding: 18,
    borderRadius: 15,
    marginBottom: 40,
  },

  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

});