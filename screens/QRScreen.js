import { useThemeStyles, themeStyle, themeColor } from "../theme/ThemeProvider";
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function QRScreen() {
  const { colors, styles } = useThemeStyles(makeStyles);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={themeStyle({ flex: 1, backgroundColor: colors.background }, colors)}>
    <ScrollView style={themeStyle({ flex: 1 }, colors)} contentContainerStyle={styles.container}>

      <Text style={styles.title}>
        Pagos con Código QR
      </Text>

      <Text style={styles.subtitle}>
        Vista de demostración. Los pagos y el escáner aún no están conectados.
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
          Cuenta de ejemplo
        </Text>

        <Text style={styles.accountInfo}>
          Cuenta Digital HEDA
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Funciones previstas
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
          Este prototipo no procesa pagos ni contiene un código QR válido.
        </Text>
      </View>

      <TouchableOpacity disabled style={themeStyle([styles.button, { opacity: 0.5 }], colors)}>
        <Text style={styles.buttonText}>
          Escanear QR
        </Text>
      </TouchableOpacity>

      <TouchableOpacity disabled style={themeStyle([styles.secondaryButton, { opacity: 0.5 }], colors)}>
        <Text style={styles.secondaryButtonText}>
          Generar QR
        </Text>
      </TouchableOpacity>

    </ScrollView>
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 28
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 10
  },

  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 18
  },

  qrCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3
  },

  qrTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 20
  },

  qrPlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: '#D9E6FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },

  qrText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.ink
  },

  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 5
  },

  accountInfo: {
    color: '#666',
    fontSize: 15
  },

  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 15
  },

  option: {
    fontSize: 16,
    color: '#444',
    marginBottom: 12
  },

  securityCard: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18
  },

  securityTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },

  securityText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22
  },

  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 15,
    marginBottom: 15
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16
  },

  secondaryButton: {
    backgroundColor: colors.ink,
    padding: 18,
    borderRadius: 15,
    marginBottom: 40
  },

  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16
  }

});
