/*
# Seed mock data for Slearn

1. Creates a demo user in auth.users so mock study sets have an owner
2. Creates a profile for the demo user
3. Inserts 8 pre-built public study sets across multiple subjects
4. Inserts flashcards for each set
5. All sets are public so they appear in the Explore page

This makes the app instantly testable — users can browse, study, and quiz
on pre-populated content immediately without creating an account.
*/

-- Create demo auth user (idempotent — only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@ylearn.app') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      encrypted_password,
      email_change_confirm_status
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'd0000000-0000-4000-8000-000000000001',
      'authenticated',
      'authenticated',
      'demo@ylearn.app',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Demo Teacher"}',
      now(),
      now(),
      '',
      0
    );
  END IF;
END $$;

-- Create profile for demo user (idempotent)
INSERT INTO profiles (id, display_name, study_streak, total_cards_learned, last_studied_date)
VALUES ('d0000000-0000-4000-8000-000000000001', 'Demo Teacher', 12, 340, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Insert mock study sets (idempotent via ON CONFLICT — we use a fixed UUID per set)
INSERT INTO study_sets (id, user_id, title, description, subject, visibility, summary, source_type, source_content, card_count)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'Biology: Human Organs',
   'AI-generated study set covering the major organs of the human body.',
   'Biology', 'public',
   '["This set covers 8 major organs of the human body and their functions.","Topics include: Heart, Lungs, Brain, Liver, Kidneys, and more.","Use flashcards mode for active recall, then test yourself with the quiz."]'::jsonb,
   'topic', 'Biology Human Organs', 8),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
   'French Vocabulary — Daily Life',
   'AI-generated study set covering common French vocabulary for daily life.',
   'French', 'public',
   '["This set covers 8 essential French vocabulary words for school and daily life.","Topics include: La nourriture, L''école, Les devoirs, Le professeur, and more.","Practice with flashcards, then quiz yourself for retention."]'::jsonb,
   'topic', 'French Unit 3 Vocab', 8),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001',
   'Chemistry: Periodic Table Basics',
   'AI-generated study set covering the periodic table fundamentals.',
   'Chemistry', 'public',
   '["This set covers 8 fundamental concepts about the periodic table.","Topics include: Atomic number, Periods, Groups, Metals, Nonmetals, and more.","Master the periodic table with flashcards and quiz modes."]'::jsonb,
   'topic', 'Periodic Table Basics', 8),
  ('a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001',
   'World History: The Renaissance',
   'AI-generated study set covering the Renaissance period.',
   'History', 'public',
   '["This set covers 8 key concepts from the Renaissance period.","Topics include: Humanism, City-states, Patronage, Art, and more.","Explore the rebirth of classical learning and its impact."]'::jsonb,
   'topic', 'The Renaissance', 8),
  ('a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001',
   'Math: Algebra Fundamentals',
   'AI-generated study set covering algebra fundamentals.',
   'Math', 'public',
   '["This set covers 8 core algebra concepts.","Topics include: Variables, Equations, Functions, Slope, and more.","Build your algebra foundation with flashcards and quizzes."]'::jsonb,
   'topic', 'Algebra Fundamentals', 8),
  ('a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001',
   'Physics: Forces and Motion',
   'AI-generated study set covering forces and motion.',
   'Physics', 'public',
   '["This set covers 8 key concepts about forces and motion.","Topics include: Newton''s Laws, Velocity, Acceleration, Friction, and more.","Master the physics of motion with flashcards and quizzes."]'::jsonb,
   'topic', 'Forces and Motion', 8),
  ('a0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000001',
   'Spanish Vocabulary — Food & Dining',
   'AI-generated study set covering Spanish food vocabulary.',
   'Spanish', 'public',
   '["This set covers 8 essential Spanish food and dining vocabulary words.","Topics include: La comida, El agua, El pan, and more.","Practice with flashcards and quiz yourself for retention."]'::jsonb,
   'topic', 'Spanish Food Vocabulary', 8),
  ('a0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000001',
   'Geography: World Continents',
   'AI-generated study set covering the world''s continents.',
   'Geography', 'public',
   '["This set covers 8 key concepts about world continents and geography.","Topics include: All 7 continents, major oceans, and key geographic terms.","Explore our world with flashcards and quiz modes."]'::jsonb,
   'topic', 'World Continents', 8)
ON CONFLICT (id) DO NOTHING;

-- Insert flashcards for each set
-- Set 1: Biology Human Organs
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Heart', 'A muscular organ that pumps blood throughout the body via the circulatory system. Has four chambers: left/right atria and left/right ventricles.'),
  ('a0000000-0000-4000-8000-000000000001', 'Lungs', 'Paired organs responsible for gas exchange — taking in oxygen and releasing carbon dioxide. Contains millions of alveoli for surface area.'),
  ('a0000000-0000-4000-8000-000000000001', 'Brain', 'The central organ of the nervous system. Controls thoughts, memory, movement, and vital functions. Divided into cerebrum, cerebellum, and brainstem.'),
  ('a0000000-0000-4000-8000-000000000001', 'Liver', 'The largest internal organ. Performs over 500 functions including detoxification, protein synthesis, and bile production.'),
  ('a0000000-0000-4000-8000-000000000001', 'Kidneys', 'Paired organs that filter blood to produce urine, regulate blood pressure, and maintain electrolyte balance. Each contains ~1 million nephrons.'),
  ('a0000000-0000-4000-8000-000000000001', 'Skin', 'The body''s largest organ. Provides protection, regulates temperature, and contains sensory receptors. Has three layers: epidermis, dermis, hypodermis.'),
  ('a0000000-0000-4000-8000-000000000001', 'Stomach', 'A muscular organ that digests food using acid and enzymes. Can hold about 1 liter of food and expands when eating.'),
  ('a0000000-0000-4000-8000-000000000001', 'Spleen', 'Part of the lymphatic system. Filters blood, recycles old red blood cells, and supports immune function.')
ON CONFLICT DO NOTHING;

-- Set 2: French Vocabulary
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000002', 'La nourriture', 'Food. Refers to what is eaten for meals. Example: "J''aime la nourriture française" (I love French food).'),
  ('a0000000-0000-4000-8000-000000000002', 'L''école', 'School. The place where students go to learn. Example: "Je vais à l''école à huit heures" (I go to school at eight o''clock).'),
  ('a0000000-0000-4000-8000-000000000002', 'Les devoirs', 'Homework/Assignments. Tasks assigned by teachers to be completed at home. Example: "Je fais mes devoirs le soir" (I do my homework in the evening).'),
  ('a0000000-0000-4000-8000-000000000002', 'Le professeur', 'Teacher/Professor. The person who teaches at a school or university. Example: "Mon professeur est très patient" (My teacher is very patient).'),
  ('a0000000-0000-4000-8000-000000000002', 'L''étudiant / L''étudiante', 'Student (masculine/feminine). A person who studies at a school. Example: "Elle est étudiante en médecine" (She is a medical student).'),
  ('a0000000-0000-4000-8000-000000000002', 'La bibliothèque', 'Library. A place where books are kept for reading and borrowing. Example: "J''étudie à la bibliothèque" (I study at the library).'),
  ('a0000000-0000-4000-8000-000000000002', 'L''examen', 'Exam/Test. A formal assessment of a student''s knowledge. Example: "J''ai un examen demain" (I have an exam tomorrow).'),
  ('a0000000-0000-4000-8000-000000000002', 'Le cahier', 'Notebook. A bound book used for writing notes. Example: "J''écris dans mon cahier" (I write in my notebook).')
ON CONFLICT DO NOTHING;

-- Set 3: Chemistry Periodic Table
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000003', 'Atomic Number', 'The number of protons in an atom''s nucleus. It defines the identity of an element. Elements on the periodic table are arranged by atomic number.'),
  ('a0000000-0000-4000-8000-000000000003', 'Atomic Mass', 'The weighted average mass of an element''s isotopes, measured in atomic mass units (amu). Found below the element symbol on the periodic table.'),
  ('a0000000-0000-4000-8000-000000000003', 'Periods', 'The horizontal rows on the periodic table (1-7). Elements in the same period have the same number of electron shells.'),
  ('a0000000-0000-4000-8000-000000000003', 'Groups', 'The vertical columns on the periodic table (1-18). Elements in the same group have similar chemical properties and the same number of valence electrons.'),
  ('a0000000-0000-4000-8000-000000000003', 'Metals', 'Elements on the left side of the periodic table. They are typically shiny, conductive, malleable, and tend to lose electrons in reactions.'),
  ('a0000000-0000-4000-8000-000000000003', 'Nonmetals', 'Elements on the right side of the periodic table. They are typically dull, poor conductors, and tend to gain electrons in reactions.'),
  ('a0000000-0000-4000-8000-000000000003', 'Metalloids', 'Elements along the staircase line (B, Si, Ge, As, Sb, Te). They have properties intermediate between metals and nonmetals.'),
  ('a0000000-0000-4000-8000-000000000003', 'Noble Gases', 'Group 18 elements (He, Ne, Ar, Kr, Xe, Rn). They have full valence shells, making them extremely unreactive.')
ON CONFLICT DO NOTHING;

-- Set 4: Renaissance
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000004', 'Renaissance', 'A period of cultural rebirth in Europe (~14th-17th century) marked by renewed interest in classical art, literature, and learning. Began in Italy.'),
  ('a0000000-0000-4000-8000-000000000004', 'Humanism', 'An intellectual movement focusing on human potential, achievement, and the study of classical texts. Emphasized individualism and secular thinking.'),
  ('a0000000-0000-4000-8000-000000000004', 'Leonardo da Vinci', 'The ultimate Renaissance man — painter, inventor, scientist, and engineer. Known for the Mona Lisa and The Last Supper.'),
  ('a0000000-0000-4000-8000-000000000004', 'Michelangelo', 'Renowned sculptor and painter. Created the statue of David and painted the Sistine Chapel ceiling.'),
  ('a0000000-0000-4000-8000-000000000004', 'The Printing Press', 'Invented by Johannes Gutenberg around 1440. Revolutionized the spread of knowledge by making books affordable and widely available.'),
  ('a0000000-0000-4000-8000-000000000004', 'Florence', 'The birthplace of the Renaissance. A wealthy Italian city-state ruled by the Medici family, who were great patrons of the arts.'),
  ('a0000000-0000-4000-8000-000000000004', 'Patronage', 'The financial support of artists and scholars by wealthy individuals or institutions. The Medici family were famous patrons.'),
  ('a0000000-0000-4000-8000-000000000004', 'Perspective', 'A technique developed during the Renaissance that creates the illusion of 3D depth on a 2D surface. Revolutionized painting.')
ON CONFLICT DO NOTHING;

-- Set 5: Algebra
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000005', 'Variable', 'A symbol (usually a letter like x or y) that represents an unknown or changing number in an equation or expression.'),
  ('a0000000-0000-4000-8000-000000000005', 'Equation', 'A mathematical statement that two expressions are equal, shown with the = sign. Example: 2x + 3 = 7.'),
  ('a0000000-0000-4000-8000-000000000005', 'Function', 'A relationship where each input has exactly one output. Written as f(x) = expression. Example: f(x) = 2x + 1.'),
  ('a0000000-0000-4000-8000-000000000005', 'Slope', 'The steepness of a line, calculated as rise over run (change in y / change in x). Formula: m = (y2 - y1) / (x2 - x1).'),
  ('a0000000-0000-4000-8000-000000000005', 'Y-intercept', 'The point where a line crosses the y-axis. In y = mx + b, b is the y-intercept.'),
  ('a0000000-0000-4000-8000-000000000005', 'Coefficient', 'The numerical multiplier of a variable. In 3x, the coefficient is 3.'),
  ('a0000000-0000-4000-8000-000000000005', 'Distributive Property', 'a(b + c) = ab + ac. Multiplication distributed across addition inside parentheses.'),
  ('a0000000-0000-4000-8000-000000000005', 'Quadratic Equation', 'A polynomial equation of degree 2, in the form ax² + bx + c = 0. Solved using the quadratic formula.')
ON CONFLICT DO NOTHING;

-- Set 6: Physics
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000006', 'Newton''s First Law (Inertia)', 'An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an external force.'),
  ('a0000000-0000-4000-8000-000000000006', 'Newton''s Second Law', 'Force = mass × acceleration (F = ma). The acceleration of an object is directly proportional to the net force and inversely proportional to its mass.'),
  ('a0000000-0000-4000-8000-000000000006', 'Newton''s Third Law', 'For every action, there is an equal and opposite reaction. Forces always come in pairs.'),
  ('a0000000-0000-4000-8000-000000000006', 'Velocity', 'Speed in a given direction. A vector quantity. Example: 60 mph north. Speed alone is just magnitude.'),
  ('a0000000-0000-4000-8000-000000000006', 'Acceleration', 'The rate of change of velocity over time. Measured in m/s². Can be positive (speeding up) or negative (slowing down).'),
  ('a0000000-0000-4000-8000-000000000006', 'Friction', 'A force that opposes motion between two surfaces in contact. Can be static (preventing motion) or kinetic (opposing moving objects).'),
  ('a0000000-0000-4000-8000-000000000006', 'Gravity', 'A force that attracts objects with mass toward each other. On Earth, acceleration due to gravity is ~9.8 m/s².'),
  ('a0000000-0000-4000-8000-000000000006', 'Momentum', 'The product of mass and velocity (p = mv). A vector quantity. Conserved in a closed system.')
ON CONFLICT DO NOTHING;

-- Set 7: Spanish
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000007', 'La comida', 'Food / Meal. Refers to food in general or the main meal of the day. Example: "La comida está deliciosa" (The food is delicious).'),
  ('a0000000-0000-4000-8000-000000000007', 'El agua', 'Water. Note: uses "el" despite being feminine because it starts with a stressed "a". Example: "Necesito agua" (I need water).'),
  ('a0000000-0000-4000-8000-000000000007', 'El pan', 'Bread. A staple food in Spanish-speaking countries. Example: "Quiero pan fresco" (I want fresh bread).'),
  ('a0000000-0000-4000-8000-000000000007', 'La fruta', 'Fruit. Example: "Me gusta la fruta en el desayuno" (I like fruit for breakfast).'),
  ('a0000000-0000-4000-8000-000000000007', 'El restaurante', 'Restaurant. Example: "Vamos al restaurante" (Let''s go to the restaurant).'),
  ('a0000000-0000-4000-8000-000000000007', 'El desayuno', 'Breakfast. The first meal of the day. Example: "Como cereal para el desayuno" (I eat cereal for breakfast).'),
  ('a0000000-0000-4000-8000-000000000007', 'La cena', 'Dinner. The main evening meal. Example: "Cenamos a las ocho" (We have dinner at eight).'),
  ('a0000000-0000-4000-8000-000000000007', 'El postre', 'Dessert. Sweet course after a meal. Example: "Quiero postre de chocolate" (I want chocolate dessert).')
ON CONFLICT DO NOTHING;

-- Set 8: Geography
INSERT INTO flashcards (set_id, front, back)
VALUES
  ('a0000000-0000-4000-8000-000000000008', 'Africa', 'The second-largest continent, home to 54 countries. Features the Sahara Desert, the Nile River (longest in the world), and diverse ecosystems from savanna to rainforest.'),
  ('a0000000-0000-4000-8000-000000000008', 'Asia', 'The largest and most populous continent. Contains 48 countries, Mount Everest (highest peak), and the Gobi Desert.'),
  ('a0000000-0000-4000-8000-000000000008', 'Europe', 'The second-smallest continent but densely populated. Contains 44 countries. Separated from Asia by the Ural Mountains.'),
  ('a0000000-0000-4000-8000-000000000008', 'North America', 'Third-largest continent. Contains 23 countries including the US, Canada, and Mexico. Features the Rocky Mountains and Great Lakes.'),
  ('a0000000-0000-4000-8000-000000000008', 'South America', 'Fourth-largest continent. Home to the Amazon Rainforest, the Andes Mountains (longest continental range), and 12 countries.'),
  ('a0000000-0000-4000-8000-000000000008', 'Antarctica', 'The southernmost continent, covered almost entirely by ice. No permanent residents — only research stations. Coldest place on Earth.'),
  ('a0000000-0000-4000-8000-000000000008', 'Australia', 'The smallest continent and also a country. Known for its unique wildlife (marsupials, monotremes) and the Great Barrier Reef.'),
  ('a0000000-0000-4000-8000-000000000008', 'Pacific Ocean', 'The largest and deepest ocean, covering about one-third of Earth''s surface. Contains the Mariana Trench, the deepest point.')
ON CONFLICT DO NOTHING;