-- Esquema inicial HOMECALM para MySQL (Aiven)
CREATE TABLE IF NOT EXISTS households (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255),
  password_changed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_members (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('bank', 'cash', 'savings') NOT NULL DEFAULT 'bank',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36),
  to_account_id VARCHAR(36),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  monthly_limit DECIMAL(15, 2) NOT NULL,
  spent DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  detail VARCHAR(255),
  event_date DATE,
  budget DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail VARCHAR(255),
  assigned_to VARCHAR(150),
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'normal',
  accent VARCHAR(50) DEFAULT 'bg-forest',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'unidades',
  place VARCHAR(100) DEFAULT 'Despensa',
  category VARCHAR(100) DEFAULT 'General',
  expires DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id VARCHAR(36) PRIMARY KEY,
  list_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'unidades',
  price DECIMAL(15, 2) DEFAULT 0.00,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debts (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  institution VARCHAR(150),
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  target_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id VARCHAR(36) PRIMARY KEY,
  debt_id VARCHAR(36) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id VARCHAR(36) PRIMARY KEY,
  goal_id VARCHAR(36) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  contribution_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  UNIQUE KEY uk_hh_week (household_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id VARCHAR(36) PRIMARY KEY,
  plan_id VARCHAR(36) NOT NULL,
  day_of_week ENUM('LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM') NOT NULL,
  meal_type ENUM('Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena') NOT NULL,
  dish_name VARCHAR(200) NOT NULL,
  description TEXT,
  portions INT DEFAULT 2,
  instructions TEXT,
  calories INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES weekly_meal_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_item_ingredients (
  id VARCHAR(36) PRIMARY KEY,
  meal_item_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'unidades',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_item_id) REFERENCES meal_plan_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(150) DEFAULT 'Nueva conversación',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  sender ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  household_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_hh_created (household_id, created_at),
  INDEX idx_audit_action (action)
);

-- Índices de Rendimiento y Escalabilidad (Fase 4)
ALTER TABLE transactions ADD INDEX IF NOT EXISTS idx_tx_hh_date (household_id, date);
ALTER TABLE transactions ADD INDEX IF NOT EXISTS idx_tx_hh_cat_date (household_id, category, type, date);
ALTER TABLE tasks ADD INDEX IF NOT EXISTS idx_tasks_hh_done_due (household_id, done, due_date);
ALTER TABLE events ADD INDEX IF NOT EXISTS idx_events_hh_date (household_id, event_date);
ALTER TABLE inventory ADD INDEX IF NOT EXISTS idx_inventory_hh_expires (household_id, expires);
ALTER TABLE shopping_items ADD INDEX IF NOT EXISTS idx_shop_items_list_purchased (list_id, purchased);
ALTER TABLE chat_messages ADD INDEX IF NOT EXISTS idx_chat_msg_conv_created (conversation_id, created_at);
ALTER TABLE meal_plan_items ADD INDEX IF NOT EXISTS idx_meal_items_plan_day (plan_id, day_of_week);




