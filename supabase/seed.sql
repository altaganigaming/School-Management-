-- Default school settings / CMS content. Run AFTER schema.sql.
-- NOTE: The Principal auth user is created by the developer (see README).
-- This seed only adds CMS content, classes, subjects, and marks the principal.

insert into public.school_settings (key, value) values
('school_name', '"Sunrise Public School"'),
('tagline', '"Where Bright Futures Begin"'),
('logo_url', '""'),
('hero_image', '"https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80"'),
('primary_color', '"#274ce4"'),
('about', '"Sunrise Public School has been nurturing young minds for over two decades. We combine academic excellence with character building, modern facilities, and dedicated faculty to help every child shine."'),
('vision', '"To be a center of educational excellence that empowers students to become compassionate, creative, and confident global citizens."'),
('mission', '"To provide holistic, affordable, quality education that develops intellect, character, and life skills in a safe and inspiring environment."'),
('principal_message', '"Education is the most powerful gift we can give our children. At Sunrise Public School, we treat every child as our own and strive to bring out the best in them — academically, morally, and creatively.<br/><br/><strong>— The Principal</strong>"'),
('facilities', '["Smart Classrooms","Science & Computer Labs","Library with 10,000+ Books","Sports Ground & Play Area","Music & Art Rooms","School Bus Service","CCTV Secured Campus","Medical Room"]'),
('contact', '{"address":"123 Education Road, Cityville","phone":"+91 90000 00000","email":"info@sunriseschool.edu","map_embed":"https://maps.google.com/maps?q=Cityville&t=&z=13&ie=UTF8&iwloc=&output=embed"}'),
('admission_info', '"Admissions open for the new academic session. Collect the admission form from the school office or download it from the Downloads section. Age criteria: Nursery 3+, KG 4+, Class I 5+ as on 31st March. Documents required: Birth certificate, previous school report card, transfer certificate (if applicable), and 4 passport-size photographs."')
on conflict (key) do nothing;

insert into public.classes (name, section) values
('Nursery','A'),('KG','A'),('Class 1','A'),('Class 2','A'),('Class 3','A'),
('Class 4','A'),('Class 5','A'),('Class 6','A'),('Class 7','A'),('Class 8','A'),
('Class 9','A'),('Class 10','A'),('Class 11','A'),('Class 12','A')
on conflict do nothing;

insert into public.subjects (name) values
('English'),('Mathematics'),('Science'),('Social Studies'),('Hindi'),
('Computer Science'),('Art'),('Physical Education')
on conflict do nothing;

insert into public.notices (title, body, category) values
('Admissions Open 2026-27', 'Admissions are now open for all classes. Limited seats available.', 'notice'),
('Annual Sports Day', 'Annual Sports Day will be held next month. All students must participate.', 'event'),
('School Wins Inter-School Quiz', 'Our senior team secured first place in the City Inter-School Quiz Competition.', 'news')
on conflict do nothing;

-- Mark the developer-created principal as super_admin.
-- Replace the email below with your Principal's auth email.
update public.profiles set role = 'super_admin', permissions = '[]'::jsonb, is_active = true
where id = (select id from auth.users where email = 'principal@yourschool.edu');
