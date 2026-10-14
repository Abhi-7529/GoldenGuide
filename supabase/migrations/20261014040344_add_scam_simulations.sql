-- Scam Simulation Center for GoldenGuide. Learners practice spotting pretend
-- scam texts, emails, phone calls and websites, pick what they would do, and
-- learn the safest action and the warning signs. Simulations are prewritten by
-- admins (no AI), are always fictional, and never contain real links: any web
-- address must use the reserved ".example" domain, which can never be a real
-- site. Practice is unlimited on every plan and does not touch
-- lesson_completions, so it never counts toward the Free daily lesson limit.
-- Each answer is recorded so learners and their connected caregivers can see
-- accuracy and which kinds of scams need more practice. The database grades
-- each answer itself, so a score can't be faked from the browser.

-- ---------------------------------------------------------------------------
-- scam simulations (admin-managed library)
-- ---------------------------------------------------------------------------
create table if not exists public.scam_simulations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  channel text not null check (channel in ('text', 'email', 'phone', 'website')),
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  lesson_id uuid references public.lessons (id) on delete set null,
  situation text not null default '',
  sender text not null default '',
  subject text not null default '',
  body text not null check (length(trim(body)) > 0),
  display_url text not null default ''
    constraint scam_simulations_display_url_fictional check (
      display_url = ''
      or display_url ~* '^(https?://)?([a-z0-9-]+\.)*[a-z0-9-]+\.example(/\S*)?$'
    ),
  choices jsonb not null default '[]'::jsonb
    constraint scam_simulations_choices_valid check (
      case
        when jsonb_typeof(choices) = 'array' then
          jsonb_array_length(choices) >= 2
          and jsonb_path_exists(choices, '$[*] ? (@.safe == true)')
        else false
      end
    ),
  warning_signs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(warning_signs) = 'array'),
  safest_action text not null check (length(trim(safest_action)) > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scam_simulations enable row level security;

create index if not exists scam_simulations_status_sort_idx
  on public.scam_simulations (status, level, sort_order);
create index if not exists scam_simulations_lesson_idx
  on public.scam_simulations (lesson_id);

drop trigger if exists scam_simulations_set_updated_at on public.scam_simulations;
create trigger scam_simulations_set_updated_at
  before update on public.scam_simulations
  for each row execute function public.set_updated_at();

create policy "scam_simulations_select_published_or_admin" on public.scam_simulations
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "scam_simulations_insert_admin" on public.scam_simulations
  for insert to authenticated
  with check (public.is_admin());

create policy "scam_simulations_update_admin" on public.scam_simulations
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "scam_simulations_delete_admin" on public.scam_simulations
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- scam simulation attempts (one row per answer a learner picks)
-- ---------------------------------------------------------------------------
create table if not exists public.scam_simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  simulation_id uuid not null references public.scam_simulations (id) on delete cascade,
  choice_index integer not null check (choice_index >= 0),
  is_safe boolean not null default false,
  channel text not null default 'text',
  level text not null default 'beginner',
  created_at timestamptz not null default now()
);

alter table public.scam_simulation_attempts enable row level security;

create index if not exists scam_simulation_attempts_user_created_idx
  on public.scam_simulation_attempts (user_id, created_at desc);
create index if not exists scam_simulation_attempts_simulation_idx
  on public.scam_simulation_attempts (simulation_id);

-- Grades the answer from the simulation itself; whatever the client sent for
-- is_safe, channel, level or created_at is ignored.
create or replace function public.set_simulation_attempt_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sim public.scam_simulations%rowtype;
begin
  select * into v_sim from public.scam_simulations where id = new.simulation_id;
  if not found or v_sim.status <> 'published' then
    raise exception 'This practice isn''t available.';
  end if;
  if new.choice_index >= jsonb_array_length(v_sim.choices) then
    raise exception 'That choice doesn''t exist.';
  end if;

  new.is_safe := coalesce((v_sim.choices -> new.choice_index ->> 'safe')::boolean, false);
  new.channel := v_sim.channel;
  new.level := v_sim.level;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.set_simulation_attempt_result() from public, anon, authenticated;

drop trigger if exists scam_simulation_attempts_set_result on public.scam_simulation_attempts;
create trigger scam_simulation_attempts_set_result
  before insert on public.scam_simulation_attempts
  for each row execute function public.set_simulation_attempt_result();

create policy "scam_simulation_attempts_select_own" on public.scam_simulation_attempts
  for select to authenticated
  using (user_id = auth.uid());

create policy "scam_simulation_attempts_select_connected_caregiver" on public.scam_simulation_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = scam_simulation_attempts.user_id
    )
  );

create policy "scam_simulation_attempts_select_admin" on public.scam_simulation_attempts
  for select to authenticated
  using (public.is_admin());

create policy "scam_simulation_attempts_insert_own" on public.scam_simulation_attempts
  for insert to authenticated
  with check (user_id = auth.uid());

-- No update or delete policies: answers can't be changed or removed by users.

-- ---------------------------------------------------------------------------
-- starter library: 12 fictional simulations, one per channel and level
-- ---------------------------------------------------------------------------
insert into public.scam_simulations
  (title, channel, level, situation, sender, subject, body, display_url, choices, warning_signs, safest_action, status, sort_order)
values
-- Beginner -------------------------------------------------------------------
(
  'You won a prize!',
  'text', 'beginner',
  'Your phone buzzes. You get this text message from a number you don''t know.',
  '(555) 010-0147',
  '',
  'CONGRATULATIONS!!! You have WON a $1,000 gift card!! To claim your prize, reply with your bank card number to pay the $4.99 shipping fee. Offer ends in 1 HOUR!',
  '',
  $j$[
    {"label": "Reply with my card number to get the prize", "safe": false, "feedback": "This is how the trick works. A real prize never asks you to pay, and your card number could be used to take your money."},
    {"label": "Delete the text and don't reply", "safe": true, "feedback": "Well done. You didn't enter a contest, so you can't win one. Deleting it is the safest thing to do."},
    {"label": "Reply STOP to make the texts stop", "safe": false, "feedback": "Replying tells the scammer your number is real, so you may get even more scam texts. It's better not to reply at all."}
  ]$j$::jsonb,
  $j$["You never entered a contest", "They want you to pay to get a prize", "They ask for your bank card number", "They rush you with a 1-hour deadline", "Lots of capital letters and exclamation marks"]$j$::jsonb,
  'Don''t reply. Delete the message. Real prizes never ask you to pay a fee or share your card number.',
  'published', 10
),
(
  'Your account is locked',
  'email', 'beginner',
  'You open your email and see this message.',
  'Bank Security <alerts@first-examp1e-bank.example>',
  'URGENT: Your acount has been LOCKED',
  E'Dear Costumer,\n\nWe detected unusual activity and your acount has been locked. To unlock it you must confirm your password and Social Security number within 24 hours or your money will be frozen.\n\nClick here to confirm: secure-unlock.first-examp1e-bank.example\n\nThank you,\nSecurity Team',
  'secure-unlock.first-examp1e-bank.example',
  $j$[
    {"label": "Click the link and type in my password", "safe": false, "feedback": "This link goes to a fake website made to steal passwords. Your bank will never ask for your password by email."},
    {"label": "Call the number on the back of my bank card to check", "safe": true, "feedback": "That's the safest choice. The number on your own card always reaches your real bank, so you know who you're talking to."},
    {"label": "Reply to the email and ask if it is real", "safe": false, "feedback": "The scammer will answer and say it is real. Never use the contact details inside a message you're unsure about."}
  ]$j$::jsonb,
  $j$["Spelling mistakes like \"acount\" and \"Costumer\"", "It says \"Dear Customer\" instead of your name", "It asks for your password and Social Security number", "It threatens you with a 24-hour deadline", "The sender's address has a \"1\" instead of an \"l\""]$j$::jsonb,
  'Don''t click the link. Call your bank using the number on the back of your card or on a paper statement.',
  'published', 20
),
(
  'A call about your computer',
  'phone', 'beginner',
  'Your home phone rings. You answer, and a man says this.',
  'Unknown caller',
  '',
  E'Hello, this is David from Windows Technical Department.\nOur system shows your computer has a dangerous virus.\nI need you to turn on your computer right now so I can fix it.\nI will also need your credit card for the $199 repair fee.',
  '',
  $j$[
    {"label": "Turn on my computer and do what he says", "safe": false, "feedback": "He wants to get into your computer and your bank accounts. Real tech companies don't call you about viruses."},
    {"label": "Hang up the phone", "safe": true, "feedback": "Exactly right. It's always okay to hang up. You don't owe a stranger on the phone anything."},
    {"label": "Give him my card number since it's only $199", "safe": false, "feedback": "There is no real virus and no real repair. Once he has your card number, he could charge much more."}
  ]$j$::jsonb,
  $j$["You didn't call them, they called you", "Tech companies don't watch your computer for viruses", "He wants control of your computer", "He asks for your credit card on the phone", "He pushes you to act right now"]$j$::jsonb,
  'Hang up. If you are worried about your computer, ask a family member or a store you trust.',
  'published', 30
),
(
  'Free cruise website',
  'website', 'beginner',
  'You click on an ad and this website opens.',
  'Dream Cruise Giveaway',
  '',
  E'🎉 YOU ARE TODAY''S LUCKY VISITOR! 🎉\nYou have been selected for a FREE 7-day cruise!\nJust enter your name, date of birth, Social Security number and bank account below to claim it.\nOnly 2 spots left!',
  'free-cruise-winner.example/claim',
  $j$[
    {"label": "Fill in the form to claim my cruise", "safe": false, "feedback": "This page is collecting details that could be used to steal your identity. There is no free cruise."},
    {"label": "Close the page", "safe": true, "feedback": "Great choice. \"Lucky visitor\" pages are a common trick. Closing the page is all you need to do."},
    {"label": "Just enter my name and date of birth, but not my bank account", "safe": false, "feedback": "Even a little information helps scammers. Your name and birthday can be used to pretend to be you."}
  ]$j$::jsonb,
  $j$["You were \"selected\" for no reason", "It asks for your Social Security number", "It asks for your bank account", "It says \"Only 2 spots left!\" to rush you", "Something free should never need your bank details"]$j$::jsonb,
  'Close the page. Never type private information into a page that says you won something.',
  'published', 40
),
-- Intermediate ---------------------------------------------------------------
(
  'Package delivery fee',
  'text', 'intermediate',
  'You are expecting a package from your daughter. Then this text arrives.',
  '(555) 010-0192',
  '',
  'Example Parcel Service: Your package is on hold because of an unpaid delivery fee of $1.25. Please pay within 48 hours so it is not returned: parcel-redelivery.example',
  'parcel-redelivery.example',
  $j$[
    {"label": "Pay the small fee so my package isn't sent back", "safe": false, "feedback": "The fee is small on purpose so you won't think twice. The real goal is to get your card details."},
    {"label": "Check the tracking number from the shop or the person who sent it", "safe": true, "feedback": "That's the safest choice. Use the tracking details you already have, not the link in a surprise text."},
    {"label": "Tap the link just to see what it says", "safe": false, "feedback": "Even just opening a scam link can lead to fake pages that look real. It's best not to tap it at all."}
  ]$j$::jsonb,
  $j$["It arrives when you might really be expecting a package", "A small fee makes it feel harmless", "It has a deadline to rush you", "The link isn't the shipping company's real website", "Delivery companies don't text you to ask for payment"]$j$::jsonb,
  'Don''t tap the link. Check your package using the tracking number from the shop or the sender.',
  'published', 50
),
(
  'Your new Medicare card',
  'email', 'intermediate',
  'This email looks official and has a government-style logo at the top.',
  'Benefits Office <cards@benefits-update.example>',
  'Action needed: New benefits card',
  E'Hello Margaret,\n\nNew benefits cards are being sent out this month. To make sure there is no gap in your coverage, please confirm your Medicare number and date of birth on our secure form.\n\nIf we don''t hear from you, your card may be delayed.\n\nBenefits Card Team',
  'benefits-update.example/confirm',
  $j$[
    {"label": "Fill in the form so my coverage doesn't stop", "safe": false, "feedback": "Your Medicare number is very valuable to scammers. Real benefit offices don't email you asking for it."},
    {"label": "Call the phone number printed on my real Medicare card", "safe": true, "feedback": "Exactly right. That number always reaches the real office, and they can tell you if anything is needed."},
    {"label": "Forward the email to a friend to ask if they got one too", "safe": false, "feedback": "Your friend might click the link. It's better to delete the email and call the number on your real card."}
  ]$j$::jsonb,
  $j$["It uses your first name to seem friendly and real", "It asks for your Medicare number and birthday", "It worries you about losing your coverage", "Government offices usually send letters, not emails like this", "The web address isn't a government website"]$j$::jsonb,
  'Don''t use the link. Call the number printed on your real card to check.',
  'published', 60
),
(
  'Grandchild in trouble',
  'phone', 'intermediate',
  'Late in the evening, your phone rings. A young voice is crying.',
  'Unknown caller',
  '',
  E'Grandma? It''s me. I''m in trouble.\nI was in a car accident and I''m at the police station.\nPlease don''t tell Mom and Dad, they''ll be so upset.\nI need $2,000 for bail. Can you buy gift cards and read me the numbers?',
  '',
  $j$[
    {"label": "Buy the gift cards quickly to help", "safe": false, "feedback": "Scammers often pretend to be a grandchild. Police never ask for bail in gift cards."},
    {"label": "Hang up and call my grandchild or their parents on a number I know", "safe": true, "feedback": "That's the safest choice. A quick call to a number you already have will tell you if they're really in trouble."},
    {"label": "Ask \"Is that you, Michael?\" to be sure", "safe": false, "feedback": "Saying a name gives the scammer the name to use. Instead, hang up and call your family yourself."}
  ]$j$::jsonb,
  $j$["They ask you to keep it a secret", "They want gift cards", "They play on your love and worry", "You can't clearly hear or see who it is", "It's an emergency that needs money right now"]$j$::jsonb,
  'Hang up. Call your grandchild or their parents on a number you already know.',
  'published', 70
),
(
  'Online store sale',
  'website', 'intermediate',
  'You search for a new tablet and find this shop with a very good deal.',
  'Mega Tech Deals',
  '',
  E'iPad-style Tablet, brand new — was $499, TODAY ONLY $59!\nPayment by wire transfer or gift card only.\nNo returns. Free shipping.\nContact us: help@mega-tech-deals.example',
  'mega-tech-deals.example/tablet-sale',
  $j$[
    {"label": "Buy it with a gift card before the sale ends", "safe": false, "feedback": "Fake shops ask for gift cards or wire transfers because the money can't be taken back."},
    {"label": "Leave the site and shop at a store I know", "safe": true, "feedback": "Well done. When a deal looks too good to be true, it usually is. Stores you know are safer."},
    {"label": "Pay by wire transfer since shipping is free", "safe": false, "feedback": "A wire transfer is like handing over cash. If the tablet never arrives, the money is gone."}
  ]$j$::jsonb,
  $j$["The price is far too low", "They only take gift cards or wire transfers", "\"Today only\" pressure", "No returns allowed", "A shop you've never heard of"]$j$::jsonb,
  'Leave the site. Shop at stores you know, and pay with a credit card, which gives you more protection.',
  'published', 80
),
-- Advanced -------------------------------------------------------------------
(
  'Fraud alert from your bank',
  'text', 'advanced',
  'You do bank with First Example Bank. This text looks just like their usual alerts.',
  '72-555',
  '',
  E'First Example Bank: Did you try to spend $842.16 at Electronics Outlet? Reply YES or NO.\n\nIf NO, a fraud specialist will call you shortly to secure your account.',
  '',
  $j$[
    {"label": "Reply NO and wait for the specialist to call", "safe": false, "feedback": "This is a clever trick. The \"specialist\" who calls is the scammer, and they'll ask for your codes or ask you to move money."},
    {"label": "Don't reply. Call the number on the back of my card", "safe": true, "feedback": "That's the safest choice. Even if the text was real, calling the number on your own card is always safe."},
    {"label": "Reply NO, then give the caller the code they text me", "safe": false, "feedback": "Never share a code that is sent to your phone. That code lets someone into your account."}
  ]$j$::jsonb,
  $j$["It looks like a real bank alert, which makes it hard to spot", "It sets up a phone call from a \"specialist\"", "It makes you scared that money is being stolen", "The next step would be a caller asking for codes or to move money"]$j$::jsonb,
  'Don''t reply to the text. Call your bank yourself using the number on the back of your card.',
  'published', 90
),
(
  'Invoice from a company you use',
  'email', 'advanced',
  'You do have an account with Example Streaming. This email has their colors and logo.',
  'Example Streaming <billing@examplestreaming-support.example>',
  'Your payment didn''t go through',
  E'Hi there,\n\nWe couldn''t process your monthly payment of $15.49. To keep watching, please update your payment details within 3 days.\n\nUpdate payment: examplestreaming-support.example/billing\n\nIf you have already updated, you can ignore this message.\n\n— The Example Streaming Team',
  'examplestreaming-support.example/billing',
  $j$[
    {"label": "Use the link to update my card", "safe": false, "feedback": "Look closely at the web address. It says \"examplestreaming-support\", not the company's real site. It's a copy made to steal your card."},
    {"label": "Open the app or type the company's website myself to check my account", "safe": true, "feedback": "That's the safest choice. If there really is a problem, you'll see it when you sign in the usual way."},
    {"label": "Ignore it, since it says I can", "safe": false, "feedback": "Ignoring it isn't harmful, but checking your account yourself is better. That way you know for sure."}
  ]$j$::jsonb,
  $j$["The web address has an extra word added to the company's name", "It looks very polished and real", "A small amount makes it feel normal", "A deadline of 3 days", "It doesn't use your name"]$j$::jsonb,
  'Don''t use links in billing emails. Open the company''s app, or type their address yourself, and check your account there.',
  'published', 100
),
(
  'Call from the "fraud department"',
  'phone', 'advanced',
  'The caller ID shows your bank''s name. The caller is calm and polite.',
  'FIRST EXAMPLE BANK',
  '',
  E'Hello, this is Karen from the First Example Bank fraud department.\nI can see your card ends in 4417 and you live on Maple Street, is that right?\nWe stopped a suspicious payment. To protect your savings, we need to move them to a new safe account.\nI''ll text you a code. Please read it back to me.',
  '',
  $j$[
    {"label": "Read her the code, since she knew my details", "safe": false, "feedback": "Scammers can find some of your details online or from old data leaks. Knowing them doesn't make the caller real."},
    {"label": "Hang up and call the number on the back of my card", "safe": true, "feedback": "Exactly right. Caller ID can be faked. Calling your bank yourself is the only way to be sure."},
    {"label": "Move my savings to the safe account she gives me", "safe": false, "feedback": "Real banks never ask you to move money to a \"safe account\". That money would go straight to the scammer."}
  ]$j$::jsonb,
  $j$["Caller ID can be faked to show your bank's name", "Knowing a few details about you doesn't prove who they are", "They want you to move money to a \"safe account\"", "They ask you to read back a code", "Polite and calm callers can still be scammers"]$j$::jsonb,
  'Hang up. Call your bank using the number on the back of your card. Never move money or share codes because a caller asks.',
  'published', 110
),
(
  'Computer warning pop-up',
  'website', 'advanced',
  'You are reading the news online. Suddenly your screen fills with this warning and a loud beeping sound.',
  'Security Alert',
  '',
  E'⚠️ WARNING: Your computer has been blocked.\nError code: #0x80072ee7\nYour personal files and bank details are at risk.\nDo not turn off your computer.\nCall Certified Support now: (555) 010-0188',
  'pc-security-alert.example/blocked',
  $j$[
    {"label": "Call the support number on the screen", "safe": false, "feedback": "The number goes to scammers. They will ask to control your computer and charge you for a fake repair."},
    {"label": "Close the browser, or restart the computer if it won't close", "safe": true, "feedback": "Well done. These pop-ups are just web pages. Closing the browser or restarting makes them go away."},
    {"label": "Leave the computer on, like it says", "safe": false, "feedback": "The warning wants to keep you scared. It's safe to close the page or turn the computer off."}
  ]$j$::jsonb,
  $j$["Real warnings never give you a phone number to call", "Loud sounds and scary words are meant to panic you", "Technical-looking error codes to seem real", "It tells you not to turn off your computer"]$j$::jsonb,
  'Don''t call the number. Close the browser or restart your computer. If you''re worried, ask someone you trust to check it.',
  'published', 120
);
