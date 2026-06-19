-- ============================================================
-- Sportunity — Seed Data
-- Run after schema.sql
-- ============================================================

-- ─── Sports ───────────────────────────────────────────────────────────────────
INSERT INTO sports (id, name, icon, color) VALUES
  (1, 'Football',    '⚽', '#22c55e'),
  (2, 'Basketball',  '🏀', '#f97316'),
  (3, 'Tennis',      '🎾', '#eab308'),
  (4, 'Running',     '🏃', '#3b82f6'),
  (5, 'Natation',    '🏊', '#06b6d4'),
  (6, 'Volleyball',  '🏐', '#8b5cf6'),
  (7, 'Padel',       '🏓', '#ec4899'),
  (8, 'Gym/Fitness', '💪', '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- ─── Users (password = "password123" hashed with bcrypt) ─────────────────────
INSERT INTO users (id, email, password_hash) VALUES
  (1, 'alex@example.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  (2, 'sarah@example.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  (3, 'thomas@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  (4, 'julie@example.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  (5, 'marc@example.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (id) DO NOTHING;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
INSERT INTO profiles (user_id, name, avatar_url, bio, level, location_lat, location_lng, city, is_coach) VALUES
  (1, 'Alex Martin',    'https://api.dicebear.com/8.x/avataaars/svg?seed=alex',   'Passionné de football et running.',                 'intermediate', 48.8566, 2.3522, 'Paris', false),
  (2, 'Sarah Dupont',   'https://api.dicebear.com/8.x/avataaars/svg?seed=sarah',  'Coach fitness certifiée BPJEPS.',                   'pro',          48.8606, 2.3376, 'Paris', true),
  (3, 'Thomas Leclerc', 'https://api.dicebear.com/8.x/avataaars/svg?seed=thomas', 'Joueur de basketball amateur. 1m90.',               'advanced',     48.8480, 2.3641, 'Paris', false),
  (4, 'Julie Bernard',  'https://api.dicebear.com/8.x/avataaars/svg?seed=julie',  'Tennis player depuis 10 ans. Classée 15/1.',        'advanced',     48.8700, 2.3300, 'Paris', false),
  (5, 'Marc Fontaine',  'https://api.dicebear.com/8.x/avataaars/svg?seed=marc',   'Coach natation. Ancien nageur de compétition.',     'pro',          48.8520, 2.3700, 'Paris', true)
ON CONFLICT DO NOTHING;

-- ─── User Sports ──────────────────────────────────────────────────────────────
INSERT INTO user_sports (user_id, sport_id) VALUES
  (1, 1), (1, 4),
  (2, 8), (2, 4),
  (3, 2),
  (4, 3), (4, 7),
  (5, 5), (5, 4)
ON CONFLICT DO NOTHING;

-- ─── Infrastructures ──────────────────────────────────────────────────────────
INSERT INTO infrastructures (id, name, type, address, lat, lng, is_public, status) VALUES
  (1,  'Terrain Léo Lagrange',      'football',   'Rue Léo Lagrange, Paris 15e',          48.8396, 2.2922, true,  'available'),
  (2,  'Gymnase Jourdain',           'basketball', '188 Rue de Belleville, Paris 20e',     48.8720, 2.3890, true,  'occupied'),
  (3,  'Tennis Club Boulogne',       'tennis',     'Allée du Bord de l''Eau, Boulogne',    48.8470, 2.2360, false, 'available'),
  (4,  'Piscine Pontoise',           'swimming',   '19 Rue de Pontoise, Paris 5e',         48.8520, 2.3510, true,  'available'),
  (5,  'Salle Omnisports Montrouge', 'gym',        'Av. de la République, Montrouge',      48.8170, 2.3190, true,  'maintenance'),
  (6,  'Terrain Foot Charléty',      'football',   'Stade Charléty, Paris 13e',            48.8190, 2.3440, true,  'available'),
  (7,  'Padel Club Nation',          'padel',      '12 Av. du Trône, Paris 12e',           48.8490, 2.3950, false, 'available'),
  (8,  'City Stade Vincennes',       'basketball', 'Route de la Pyramide, Vincennes',      48.8450, 2.4400, true,  'available'),
  (9,  'Stade Jean Bouin',           'running',    '26 Av. du Général Sarrail, Paris 16e', 48.8440, 2.2530, false, 'available'),
  (10, 'Beach Volley Bercy',         'volleyball', 'Parc de Bercy, Paris 12e',             48.8380, 2.3810, true,  'occupied')
ON CONFLICT (id) DO NOTHING;

-- ─── Events ───────────────────────────────────────────────────────────────────
INSERT INTO events (title, sport_id, infrastructure_id, creator_id, date, max_participants, description, level) VALUES
  ('Match foot 5v5 - Niveau intermédiaire', 1, 1, 1, NOW() + INTERVAL '2 hours',   10, 'Venez jouer un match convivial !',                   'intermediate'),
  ('Basketball 3×3 — Tous niveaux',         2, 2, 3, NOW() + INTERVAL '5 hours',   6,  'Petite session basket, ambiance détendue.',           'all'),
  ('Tennis double mixte',                   3, 3, 4, NOW() + INTERVAL '1 day',     4,  'Double mixte samedi matin. Niveau 15/1 à 4/6.',       'advanced'),
  ('Run collectif — 10km Bois de Boulogne', 4, 9, 2, NOW() + INTERVAL '2 days',   20, 'Sortie running dominicale. Rythme 5:30/km.',          'intermediate'),
  ('Padel débutants — Cours collectif',     7, 7, 2, NOW() + INTERVAL '3 days',    4,  'Initiation padel pour débutants. Raquettes fournies.','beginner')
ON CONFLICT DO NOTHING;

-- ─── Coaches ──────────────────────────────────────────────────────────────────
INSERT INTO coaches (user_id, sport_id, hourly_rate, description, experience_years, rating, certifications) VALUES
  (2, 8, 60.00, 'Coach fitness certifiée BPJEPS. Spécialisée remise en forme et préparation physique.',   5, 4.8, ARRAY['BPJEPS APT', 'CrossFit Level 1']),
  (5, 5, 45.00, 'Ex-nageur compétition national. Cours tous niveaux, eau libre inclus.',                   8, 4.9, ARRAY['Maître Nageur BEESAN', 'Sauveteur Aquatique']),
  (4, 3, 55.00, 'Joueuse classée 15/1. Cours tennis individuels et collectifs. Méthode progressive.',     3, 4.6, ARRAY['Moniteur Tennis FFT'])
ON CONFLICT DO NOTHING;
