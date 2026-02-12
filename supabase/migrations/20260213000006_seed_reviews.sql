-- Seed sample reviews for tenants
-- This creates 10 diverse reviews across different tenants

INSERT INTO public.reviews (
  tenant_id,
  rating,
  reviewer_name,
  reviewer_email,
  title,
  comment,
  is_verified,
  is_approved,
  is_featured,
  created_at
) VALUES
  -- Iska Saloon Reviews (salon)
  (
    '00000000-0000-0000-0000-000000000001',
    5,
    'Michael Johnson',
    'michael.j@example.com',
    'Best haircut I''ve ever had!',
    'Marcus gave me the perfect fade. The booking system was so easy to use and I got exactly what I wanted. Highly recommend!',
    true,
    true,
    true,
    now() - INTERVAL '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    5,
    'Sarah Williams',
    'sarah.w@example.com',
    'Professional and friendly service',
    'Sofia did an amazing job with my color. The salon is clean, modern, and the staff is incredibly professional. Will definitely be back!',
    true,
    true,
    false,
    now() - INTERVAL '12 days'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    4,
    'David Chen',
    'david.c@example.com',
    'Great experience overall',
    'Good service, easy booking. The only reason I''m not giving 5 stars is because I had to wait a few minutes past my appointment time. Otherwise excellent!',
    false,
    true,
    false,
    now() - INTERVAL '8 days'
  ),

  -- Zenith Spa Reviews
  (
    '00000000-0000-0000-0000-000000000002',
    5,
    'Emily Rodriguez',
    'emily.r@example.com',
    'Pure relaxation',
    'The hot stone massage was incredible. Mei Lin is a true professional. I left feeling completely rejuvenated. The booking process was seamless.',
    true,
    true,
    true,
    now() - INTERVAL '6 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    5,
    'James Anderson',
    'james.a@example.com',
    'Exceeded expectations',
    'My wife and I did a couples massage. The atmosphere is serene and the therapists are skilled. Worth every penny!',
    true,
    true,
    false,
    now() - INTERVAL '15 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    4,
    'Lisa Thompson',
    'lisa.t@example.com',
    'Nice facial treatment',
    'Priya gave me a great hydrating facial. My skin felt amazing afterwards. The spa is beautiful and well-maintained.',
    false,
    true,
    false,
    now() - INTERVAL '10 days'
  ),

  -- Apex Auto Care Reviews
  (
    '00000000-0000-0000-0000-000000000003',
    5,
    'Robert Martinez',
    'robert.m@example.com',
    'Honest and reliable mechanics',
    'Mike and his team fixed my transmission issue quickly and fairly. They explained everything clearly and didn''t try to upsell unnecessary services. Highly trustworthy!',
    true,
    true,
    true,
    now() - INTERVAL '7 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    4,
    'Jennifer Lee',
    'jennifer.l@example.com',
    'Fast oil change service',
    'Got my oil changed and tire rotation done. Quick service, fair pricing. The online booking made it so convenient.',
    false,
    true,
    false,
    now() - INTERVAL '9 days'
  ),

  -- Clarity Medical Clinic Reviews
  (
    '00000000-0000-0000-0000-000000000004',
    5,
    'Thomas Brown',
    'thomas.b@example.com',
    'Excellent medical care',
    'Dr. Mitchell is thorough and caring. The clinic is modern and the staff is professional. Easy to book appointments online.',
    true,
    true,
    true,
    now() - INTERVAL '4 days'
  ),

  -- Iron Forge Fitness Reviews
  (
    '00000000-0000-0000-0000-000000000005',
    5,
    'Amanda Davis',
    'amanda.d@example.com',
    'Best fitness studio in town!',
    'Jordan is an amazing trainer. I''ve seen incredible results in just 2 months. The HIIT classes are intense but so rewarding. Love the booking system!',
    true,
    true,
    false,
    now() - INTERVAL '11 days'
  );

-- Update helpful_count randomly for some reviews
UPDATE public.reviews SET helpful_count = 3 WHERE reviewer_name = 'Michael Johnson';
UPDATE public.reviews SET helpful_count = 5 WHERE reviewer_name = 'Emily Rodriguez';
UPDATE public.reviews SET helpful_count = 2 WHERE reviewer_name = 'Robert Martinez';
