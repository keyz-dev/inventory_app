import { ROLE_PERMISSIONS, User } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type UserContextType = {
  currentUser: User | null;
  users: User[];
  login: (user: User) => void;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getPermissions: () => any;
  isLoggedIn: boolean;
  switchUser: (user: User) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'inventory_users';
const CURRENT_USER_KEY = 'current_user';

// Default users for initial setup - users create their own PINs
const DEFAULT_USERS: User[] = [
  {
    id: 'manager_1',
    name: 'Manager',
    role: 'manager',
    pin: '1234',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cashier_1',
    name: 'Cashier',
    role: 'cashier',
    pin: '5678',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'viewer_1',
    name: 'Viewer',
    role: 'viewer',
    pin: '9999',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load users from storage on app start
  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        // First time setup - save default users
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
        setUsers(DEFAULT_USERS);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers(DEFAULT_USERS);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const saveUsers = async (newUsers: User[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  };

  const saveCurrentUser = async (user: User | null) => {
    try {
      if (user) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('Failed to save current user:', error);
    }
  };

  const login = (user: User) => {
    const updatedUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };
    
    setCurrentUser(updatedUser);
    setIsLoggedIn(true);
    saveCurrentUser(updatedUser);
    
    // Update user in users list
    const updatedUsers = users.map(u => 
      u.id === user.id ? updatedUser : u
    );
    saveUsers(updatedUsers);
  };

  const logout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    saveCurrentUser(null);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    const newUsers = [...users, newUser];
    saveUsers(newUsers);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const updatedUsers = users.map(user => 
      user.id === id ? { ...user, ...updates } : user
    );
    saveUsers(updatedUsers);
    
    // Update current user if it's the same user
    if (currentUser?.id === id) {
      setCurrentUser({ ...currentUser, ...updates });
      saveCurrentUser({ ...currentUser, ...updates });
    }
  };

  const deleteUser = (id: string) => {
    const newUsers = users.filter(user => user.id !== id);
    saveUsers(newUsers);
    
    // Logout if current user is deleted
    if (currentUser?.id === id) {
      logout();
    }
  };

  const getPermissions = () => {
    if (!currentUser) return null;
    return ROLE_PERMISSIONS[currentUser.role];
  };

  const switchUser = (user: User) => {
    login(user);
  };

  const value: UserContextType = {
    currentUser,
    users,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    getPermissions,
    isLoggedIn,
    switchUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Helper hooks for specific permissions
export function usePermissions() {
  const { getPermissions } = useUser();
  return getPermissions();
}

export function useCanSell() {
  const permissions = usePermissions();
  return permissions?.canSell ?? false;
}

export function useCanManageProducts() {
  const permissions = usePermissions();
  return permissions?.canManageProducts ?? false;
}

export function useCanAdjustStock() {
  const permissions = usePermissions();
  return permissions?.canAdjustStock ?? false;
}

export function useCanViewAnalytics() {
  const permissions = usePermissions();
  return permissions?.canViewAnalytics ?? false;
}

export function useCanManageSettings() {
  const permissions = usePermissions();
  return permissions?.canManageSettings ?? false;
}

export function useCanManageUsers() {
  const permissions = usePermissions();
  return permissions?.canManageUsers ?? false;
}
