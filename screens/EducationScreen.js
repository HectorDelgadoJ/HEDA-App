import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function EducationScreen() {
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        Educación Financiera IA
      </Text>

      <Text style={styles.subtitle}>
        Aprende conceptos financieros básicos mediante recomendaciones inteligentes.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          ¿Qué es la inflación?
        </Text>

        <Text style={styles.cardText}>
          La inflación provoca que el dinero pierda valor con el tiempo. 
          Por eso es importante ahorrar e invertir inteligentemente.
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Aprender más
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Interés compuesto
        </Text>

        <Text style={styles.cardText}>
          El interés compuesto permite generar ganancias sobre ganancias, 
          aumentando el crecimiento del dinero a largo plazo.
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Ver ejemplo
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Fondo de emergencia
        </Text>

        <Text style={styles.cardText}>
          Un fondo de emergencia ayuda a cubrir gastos inesperados 
          sin afectar tus finanzas personales.
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Crear fondo
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>
          Recomendación IA
        </Text>

        <Text style={styles.tipText}>
          Detectamos que tus gastos en entretenimiento aumentaron este mes.
          Considera establecer un límite semanal.
        </Text>
      </View>

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

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 10,
  },

  cardText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 18,
  },

  button: {
    backgroundColor: '#0A84FF',
    padding: 14,
    borderRadius: 12,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },

  tipCard: {
    backgroundColor: '#001F54',
    borderRadius: 20,
    padding: 22,
    marginBottom: 40,
  },

  tipTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  tipText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
  },

});