import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function GoalsScreen() {
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        Metas de Ahorro
      </Text>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>
          Camioneta Nueva
        </Text>

        <Text style={styles.goalAmount}>
          $180,000 / $450,000
        </Text>

        <View style={styles.progressBarBackground}>
          <View style={styles.progressBarFill} />
        </View>

        <Text style={styles.goalPercentage}>
          40% completado
        </Text>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>
          Viaje a Europa
        </Text>

        <Text style={styles.goalAmount}>
          $35,000 / $80,000
        </Text>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: '45%' }]} />
        </View>

        <Text style={styles.goalPercentage}>
          45% completado
        </Text>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>
          Fondo de Emergencia
        </Text>

        <Text style={styles.goalAmount}>
          $15,000 / $50,000
        </Text>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: '30%' }]} />
        </View>

        <Text style={styles.goalPercentage}>
          30% completado
        </Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Crear nueva meta
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
    marginBottom: 25,
  },

  goalCard: {
    backgroundColor: 'white',
    padding: 22,
    borderRadius: 20,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F54',
    marginBottom: 10,
  },

  goalAmount: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
  },

  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#D9E6FF',
    borderRadius: 20,
    overflow: 'hidden',
  },

  progressBarFill: {
    width: '40%',
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 20,
  },

  goalPercentage: {
    marginTop: 10,
    color: '#001F54',
    fontWeight: 'bold',
  },

  button: {
    backgroundColor: '#001F54',
    padding: 18,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 40,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

});