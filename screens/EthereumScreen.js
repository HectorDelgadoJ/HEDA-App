import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function EthereumScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>

      <Text style={styles.title}>
        Ethereum
      </Text>

      <Text style={styles.subtitle}>
        Demostración educativa con valores de ejemplo; no son cotizaciones actuales.
      </Text>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>
          Precio de ejemplo · ETH
        </Text>

        <Text style={styles.price}>
          $3,250 USD
        </Text>

        <Text style={styles.change}>
          +4.2% últimas 24 horas
        </Text>
      </View>

      <View style={styles.predictionCard}>
        <Text style={styles.predictionTitle}>
          Escenario ilustrativo
        </Text>

        <Text style={styles.predictionText}>
          Ejemplo de un escenario de subida. No existe todavía un modelo predictivo conectado.
        </Text>

        <Text style={styles.predictionValue}>
          Valor hipotético:
        </Text>

        <Text style={styles.futurePrice}>
          $3,480 USD
        </Text>
      </View>

      <View style={styles.analysisCard}>
        <Text style={styles.analysisTitle}>
          Factores por considerar
        </Text>

        <Text style={styles.analysisItem}>
          • Volumen de mercado
        </Text>

        <Text style={styles.analysisItem}>
          • Tendencias históricas
        </Text>

        <Text style={styles.analysisItem}>
          • Variaciones diarias
        </Text>

        <Text style={styles.analysisItem}>
          • Indicadores financieros
        </Text>

        <Text style={styles.analysisItem}>
          • Comportamiento del mercado
        </Text>
      </View>

      <View style={styles.riskCard}>
        <Text style={styles.riskTitle}>
          Advertencia Financiera
        </Text>

        <Text style={styles.riskText}>
          Las criptomonedas son activos de alto riesgo y volatilidad.
          Esta información es únicamente educativa y no representa asesoría financiera.
        </Text>
      </View>



    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 18,
  },

  priceCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  priceLabel: {
    color: 'white',
    fontSize: 16,
  },

  price: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },

  change: {
    color: '#D9F6FF',
    marginTop: 10,
    fontSize: 16,
  },

  predictionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  predictionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 12,
  },

  predictionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 20,
  },

  predictionValue: {
    color: '#666',
    fontSize: 15,
  },

  futurePrice: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },

  analysisCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 15,
  },

  analysisItem: {
    fontSize: 16,
    color: '#444',
    marginBottom: 10,
  },

  riskCard: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  riskTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  riskText: {
    color: 'white',
    lineHeight: 22,
    fontSize: 15,
  },

  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 15,
    marginBottom: 40,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

});