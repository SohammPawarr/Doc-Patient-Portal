const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');

// Ensure data directory and files exist
const initializeDatabase = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify([], null, 2));
  }
};

// Initialize on module load
initializeDatabase();

// User operations
const getUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

const findUserById = (id) => {
  const users = getUsers();
  return users.find(user => user.id === id);
};

const createUser = (userData) => {
  const users = getUsers();
  users.push(userData);
  saveUsers(users);
  return userData;
};

// Appointment operations
const getAppointments = () => {
  try {
    const data = fs.readFileSync(APPOINTMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveAppointments = (appointments) => {
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2));
};

const getAppointmentsByUserId = (userId) => {
  const appointments = getAppointments();
  return appointments.filter(apt => apt.userId === userId);
};

const getAppointmentById = (id) => {
  const appointments = getAppointments();
  return appointments.find(apt => apt.id === id);
};

const getAppointmentByToken = (token) => {
  const appointments = getAppointments();
  return appointments.find(apt => apt.confirmationToken === token);
};

const createAppointment = (appointmentData) => {
  const appointments = getAppointments();
  appointments.push(appointmentData);
  saveAppointments(appointments);
  return appointmentData;
};

const updateAppointment = (id, updates) => {
  const appointments = getAppointments();
  const index = appointments.findIndex(apt => apt.id === id);
  if (index !== -1) {
    appointments[index] = { ...appointments[index], ...updates };
    saveAppointments(appointments);
    return appointments[index];
  }
  return null;
};

const deleteAppointment = (id) => {
  const appointments = getAppointments();
  const index = appointments.findIndex(apt => apt.id === id);
  if (index !== -1) {
    const deleted = appointments.splice(index, 1);
    saveAppointments(appointments);
    return deleted[0];
  }
  return null;
};

module.exports = {
  // User operations
  getUsers,
  findUserByEmail,
  findUserById,
  createUser,
  
  // Appointment operations
  getAppointments,
  getAppointmentsByUserId,
  getAppointmentById,
  getAppointmentByToken,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
