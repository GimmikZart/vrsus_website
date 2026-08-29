-- Public CMS projections expose only fields intended for the public website.
create view public.public_activities
with (security_invoker = false)
as
select
  activity.id,
  activity.slug,
  activity.name,
  activity.short_description,
  activity.description,
  activity.image_path,
  activity.seo_title,
  activity.seo_description,
  category.slug as category_slug,
  category.name as category_name
from public.activities activity
left join public.activity_categories category on category.id = activity.category_id
where activity.active = true
  and activity.archived_at is null
  and (category.id is null or category.active = true);

create view public.public_news_posts
with (security_invoker = false)
as
select
  post.id,
  post.slug,
  post.title,
  post.excerpt,
  post.content,
  post.cover_image_path,
  post.published_at,
  post.seo_title,
  post.seo_description,
  post.seo_image_path
from public.news_posts post
where post.status = 'published'
  and post.published_at is not null
  and post.published_at <= timezone('utc', now());

create view public.public_service_pages
with (security_invoker = false)
as
select
  service.id,
  service.slug,
  service.title,
  service.excerpt,
  service.content,
  service.cover_image_path,
  service.sort_order,
  service.seo_title,
  service.seo_description,
  service.seo_image_path
from public.service_pages service
where service.active = true;

grant select on public.public_activities to anon, authenticated;
grant select on public.public_news_posts to anon, authenticated;
grant select on public.public_service_pages to anon, authenticated;

comment on view public.public_activities is
  'Public activity projection. Internal metadata and capacity are omitted.';
comment on view public.public_news_posts is
  'Published news projection. Editorial flags and author internals are omitted.';
comment on view public.public_service_pages is
  'Active service page projection.';
