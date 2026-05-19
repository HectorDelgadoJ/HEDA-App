import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function ExpensesScreen() {
  return (
    <ScrollView style={styles.container}>
      
      <Text style={styles.title}>
        Registro de Ingresos y Gastos
      </Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>
          Balance mensual
        </Text>

        <Text style={styles.balance}>
          $12,450 MXN
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Movimientos recientes
        </Text>

        <View style={styles.transactionCard}>
          <View>
            <Text style={styles.transactionTitle}>
              Starbucks
            </Text>

            <Text style={styles.transactionDate}>
              18 Mayo 2026
            </Text>
          </View>

          <Text style={styles.expense}>
            - $120
          </Text>
        </View>

        <View style={styles.transactionCard}>
          <View>
            <Text style={styles.transactionTitle}>
              Depósito Nómina
            </Text>

            <Text style={styles.transactionDate}>
              17 Mayo 2026
            </Text>
          </View>

          <Text style={styles.income}>
            + $5,000
          </Text>
        </View>

        <View style={styles.transactionCard}>
          <View>
            <Text style={styles.transactionTitle}>
              Netflix
            </Text>

            <Text style={styles.transactionDate}>
              16 Mayo 2026
            </Text>
          </View>

          <Text style={styles.expense}>
            - $219
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Registrar movimiento
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

  balanceCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
  },

  balanceLabel: {
    color: 'white',
    fontSize: 16,
  },

  balance: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 10,
  },

  section: {
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#001F54',
  },

  transactionCard: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001F54',
  },

  transactionDate: {
    color: '#666',
    marginTop: 4,
  },

  income: {
    color: 'green',
    fontWeight: 'bold',
    fontSize: 16,
  },

  expense: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
  },

  button: {
    backgroundColor: '#001F54',
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