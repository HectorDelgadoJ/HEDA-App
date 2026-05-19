import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function EthereumScreen() {
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        Predicción de Ethereum
      </Text>

      <Text style={styles.subtitle}>
        Análisis predictivo basado en inteligencia artificial y tendencias del mercado.
      </Text>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>
          Precio actual ETH
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
          Predicción IA
        </Text>

        <Text style={styles.predictionText}>
          El modelo predictivo estima una tendencia alcista moderada para Ethereum durante los próximos 7 días.
        </Text>

        <Text style={styles.predictionValue}>
          Predicción estimada:
        </Text>

        <Text style={styles.futurePrice}>
          $3,480 USD
        </Text>
      </View>

      <View style={styles.analysisCard}>
        <Text style={styles.analysisTitle}>
          Factores analizados
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

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Ver análisis completo
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

  priceCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
  },

  priceLabel: {
    color: 'white',
    fontSize: 16,
  },

  price: {
    color: 'white',
    fontSize: 38,
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
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  predictionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001F54',
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
    fontSize: 34,
    fontWeight: 'bold',
    color: '#0A84FF',
    marginTop: 8,
  },

  analysisCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  analysisTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 15,
  },

  analysisItem: {
    fontSize: 16,
    color: '#444',
    marginBottom: 10,
  },

  riskCard: {
    backgroundColor: '#001F54',
    borderRadius: 20,
    padding: 22,
    marginBottom: 25,
  },

  riskTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  riskText: {
    color: 'white',
    lineHeight: 22,
    fontSize: 15,
  },

  button: {
    backgroundColor: '#0A84FF',
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