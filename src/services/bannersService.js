import { supabase } from './supabaseClient';

function mapBanner(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.image_url,
    linkTo: row.link_to,
    active: row.active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

function mapPromo(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    imageUrl: row.image_url,
    linkTo: row.link_to,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function getActiveBanners() {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data.map(mapBanner);
}

export async function getAllBanners() {
  const { data, error } = await supabase.from('banners').select('*').order('display_order', { ascending: true });
  if (error) throw error;
  return data.map(mapBanner);
}

export async function createBanner(banner) {
  const { data, error } = await supabase
    .from('banners')
    .insert({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.imageUrl,
      link_to: banner.linkTo,
      active: true,
      display_order: banner.order || 99,
    })
    .select()
    .single();
  if (error) throw error;
  return mapBanner(data);
}

export async function updateBanner(id, patch) {
  const dbPatch = {};
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (patch.order !== undefined) dbPatch.display_order = patch.order;
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.subtitle !== undefined) dbPatch.subtitle = patch.subtitle;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  if (patch.linkTo !== undefined) dbPatch.link_to = patch.linkTo;
  const { error } = await supabase.from('banners').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteBanner(id) {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

export async function getActivePromos() {
  const { data, error } = await supabase.from('promos').select('*').eq('active', true);
  if (error) throw error;
  return data.map(mapPromo);
}

export async function getAllPromos() {
  const { data, error } = await supabase.from('promos').select('*');
  if (error) throw error;
  return data.map(mapPromo);
}

export async function createPromo(promo) {
  const { data, error } = await supabase
    .from('promos')
    .insert({ label: promo.label, image_url: promo.imageUrl, link_to: promo.linkTo, active: true })
    .select()
    .single();
  if (error) throw error;
  return mapPromo(data);
}

export async function updatePromo(id, patch) {
  const dbPatch = {};
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (patch.label !== undefined) dbPatch.label = patch.label;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  if (patch.linkTo !== undefined) dbPatch.link_to = patch.linkTo;
  const { error } = await supabase.from('promos').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deletePromo(id) {
  const { error } = await supabase.from('promos').delete().eq('id', id);
  if (error) throw error;
}
