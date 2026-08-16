-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game instances table
CREATE TABLE IF NOT EXISTS game_instances (
  id SERIAL PRIMARY KEY,
  instance_id VARCHAR(255) UNIQUE NOT NULL,
  game_name VARCHAR(255) NOT NULL,
  host_player_id VARCHAR(255) NOT NULL,
  max_players INTEGER DEFAULT 2,
  current_players INTEGER DEFAULT 1,
  port INTEGER,
  status VARCHAR(50) DEFAULT 'running',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  FOREIGN KEY (host_player_id) REFERENCES users(player_id)
);

-- Player game sessions table (for tracking who's in which game)
CREATE TABLE IF NOT EXISTS player_game_sessions (
  id SERIAL PRIMARY KEY,
  instance_id VARCHAR(255) NOT NULL,
  player_id VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES game_instances(instance_id),
  FOREIGN KEY (player_id) REFERENCES users(player_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_player_id ON users(player_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_game_instances_host ON game_instances(host_player_id);
CREATE INDEX IF NOT EXISTS idx_game_instances_status ON game_instances(status);
CREATE INDEX IF NOT EXISTS idx_player_game_sessions_instance ON player_game_sessions(instance_id);
CREATE INDEX IF NOT EXISTS idx_player_game_sessions_player ON player_game_sessions(player_id);
