import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { initDb, checkMigration, setMigrationDone } from './src/db/database';
import { importFromAppBudget } from './src/db/migrate';
import { DemoProvider, useDemo } from './src/context/DemoContext';

import DashboardScreen from './src/screens/DashboardScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import IncomesScreen from './src/screens/IncomesScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import SavingsAccountDetailScreen from './src/screens/SavingsAccountDetailScreen';
import MonthlyBalancesScreen from './src/screens/MonthlyBalancesScreen';
import YearlyDetailScreen from './src/screens/YearlyDetailScreen';
import SavingsPieScreen from './src/screens/SavingsPieScreen';
import ExpenseCategoryDetailScreen from './src/screens/ExpenseCategoryDetailScreen';

const Tab = createBottomTabNavigator();
const DashStack = createStackNavigator();
const SavingsStack = createStackNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: '#1a237e' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
};

function DashboardNavigator() {
  return (
    <DashStack.Navigator screenOptions={headerOpts}>
      <DashStack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Podsumowanie' }} />
      <DashStack.Screen name="MonthlyBalances" component={MonthlyBalancesScreen} options={{ title: 'Historia bilansów' }} />
      <DashStack.Screen name="YearlyDetail" component={YearlyDetailScreen} options={{ title: 'Podsumowanie roczne' }} />
      <DashStack.Screen name="SavingsPie" component={SavingsPieScreen} options={{ title: 'Podział oszczędności' }} />
      <DashStack.Screen name="ExpenseCategoryDetail" component={ExpenseCategoryDetailScreen} options={{ title: 'Wydatki wg kategorii' }} />
    </DashStack.Navigator>
  );
}

function SavingsNavigator() {
  return (
    <SavingsStack.Navigator screenOptions={headerOpts}>
      <SavingsStack.Screen name="SavingsList" component={SavingsScreen} options={{ title: 'Oszczędności' }} />
      <SavingsStack.Screen name="AccountDetail" component={SavingsAccountDetailScreen}
        options={({ route }) => ({ title: route.params.accountName })} />
    </SavingsStack.Navigator>
  );
}

function AppNavigator() {
  const { isDemoMode } = useDemo();
  return (
    <NavigationContainer key={isDemoMode ? 'demo' : 'real'}>
      <Tab.Navigator screenOptions={{
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: '#bdbdbd',
        tabBarStyle: { height: 62, paddingBottom: 10, paddingTop: 6, backgroundColor: '#fff', borderTopColor: '#f0f0f0' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      }}>
        <Tab.Screen name="DashTab" component={DashboardNavigator}
          options={{ title: 'Podsumowanie', tabBarIcon: () => <Text style={s.icon}>📊</Text> }} />
        <Tab.Screen name="Expenses" component={ExpensesScreen}
          options={{ title: 'Wydatki', tabBarIcon: () => <Text style={s.icon}>💸</Text>, ...headerOpts, headerShown: true }} />
        <Tab.Screen name="Incomes" component={IncomesScreen}
          options={{ title: 'Wpływy', tabBarIcon: () => <Text style={s.icon}>💰</Text>, ...headerOpts, headerShown: true }} />
        <Tab.Screen name="SavingsTab" component={SavingsNavigator}
          options={{ title: 'Oszczędności', tabBarIcon: () => <Text style={s.icon}>🏦</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const migrated = await checkMigration();
        if (!migrated) {
          await importFromAppBudget();
          await setMigrationDone();
        }
        setReady(true);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (error) return <View style={s.center}><Text style={s.error}>Błąd:{'\n'}{error}</Text></View>;
  if (!ready) return <View style={s.center}><Text style={s.loading}>Ładowanie...</Text></View>;

  return (
    <DemoProvider>
      <AppNavigator />
    </DemoProvider>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loading: { fontSize: 18, color: '#999' },
  error: { fontSize: 15, color: '#e53935', textAlign: 'center', padding: 20 },
  icon: { fontSize: 22 },
});
