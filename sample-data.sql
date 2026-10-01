-- OPTIONAL demo content (placeholders only, no real titles, no download links).
-- Delete these records from the admin panel before launch.
insert into public.categories (name, slug, sort_order, show_in_nav, show_on_home) values
  ('Turkish Dramas','turkish-dramas',1,true,true),
  ('Urdu Subtitles','urdu-subtitles',2,true,true),
  ('Movies','movies',3,true,false),
  ('New Releases','new-releases',4,false,false)
on conflict (slug) do nothing;

insert into public.dramas (title, slug, description, category_id, kind, language, subtitle, status, featured, published, release_date)
select 'Demo Turkish Drama','demo-turkish-drama','Demo record. Replace with a title you are authorized to publish.', c.id,'series','Turkish','English','ongoing',true,true,current_date
from public.categories c where c.slug='turkish-dramas' on conflict (slug) do nothing;
insert into public.dramas (title, slug, description, category_id, kind, language, subtitle, status, featured, published, release_date)
select 'Demo Urdu Subtitle Series','demo-urdu-subtitle-series','Demo record. Replace with a title you are authorized to publish.', c.id,'series','Turkish','Urdu','ongoing',false,true,current_date
from public.categories c where c.slug='urdu-subtitles' on conflict (slug) do nothing;
insert into public.dramas (title, slug, description, category_id, kind, language, subtitle, status, featured, published, release_date)
select 'Demo Movie','demo-movie','Demo record. Replace with a title you are authorized to publish.', c.id,'movie','Turkish','English','completed',false,true,current_date
from public.categories c where c.slug='movies' on conflict (slug) do nothing;

insert into public.episodes (drama_id, season_number, episode_number, title, description, status, published)
select d.id, 1, n, 'Demo Episode '||n, 'Demo episode description.', case when n<=3 then 'available' else 'coming_soon' end, true
from public.dramas d, generate_series(1,4) n where d.slug='demo-turkish-drama' on conflict do nothing;
