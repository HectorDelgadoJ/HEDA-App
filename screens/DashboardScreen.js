import { View, Text, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a HEDA</Text>

      <View style={styles.card}>
        <Text style={styles.balanceLabel}>
          Balance actual
        </Text>

        <Text style={styles.balance}>
          $12,450 MXN
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    padding: 20,
    paddingTop: 80,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#001F54',
  },

  card: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    padding: 25,
  },

  balanceLabel: {
    color: 'white',
    fontSize: 16,
  },

  balance: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
});