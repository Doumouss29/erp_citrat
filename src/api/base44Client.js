// Compatibility adapter for gradual migration from Base44 to local API.
// Unsupported functions intentionally fail instead of silently returning fake data.
const request = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin', ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || data.error || `API ${response.status}`);
    error.status = response.status; error.data = data; throw error;
  }
  return data;
};
const body = value => JSON.stringify(value);
const url = (entity, op, params = {}) => `/entities/${encodeURIComponent(entity)}${op}${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`;
const entity = name => ({
  list: (sort = '-created_date', limit = 100, skip = 0) => request(url(name, '', {sort,limit,skip})),
  filter: (query = {}, sort = '-created_date', limit = 100, skip = 0) => request(url(name,'/filter'), { method:'POST', body:body({query,sort,limit,skip}) }),
  get: id => request(url(name,`/${encodeURIComponent(id)}`)),
  create: data => request(url(name,''), {method:'POST',body:body(data)}),
  update: (id,data) => request(url(name,`/${encodeURIComponent(id)}`), {method:'PATCH',body:body(data)}),
  delete: id => request(url(name,`/${encodeURIComponent(id)}`), {method:'DELETE'}),
  bulkCreate: records => request(url(name,'/bulk'),{method:'POST',body:body(records)}),
  subscribe: () => { throw new Error('Realtime subscriptions are not implemented in this standalone starter'); },
  aggregate: () => { throw new Error('Aggregation backend not migrated yet'); },
  deleteMany: () => { throw new Error('Bulk deletion backend not migrated yet'); },
  bulkUpdate: () => { throw new Error('Bulk update backend not migrated yet'); }
});
export const base44 = {
  entities: new Proxy({}, {get: (_, name) => name === 'User'
    ? {
        list: () => request('/admin/users'),
        filter: async (query = {}) => (await request('/admin/users')).filter(u => Object.entries(query).every(([k,v]) => u[k] === v)),
        get: async id => (await request('/admin/users')).find(u => u.id === id),
        update: (id,data) => request('/admin/users/'+encodeURIComponent(id),{method:'PATCH',body:body(data)}),
        delete: id => request('/admin/users/'+encodeURIComponent(id),{method:'DELETE'}),
        setStatus: (id,status) => request('/admin/accounts/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:body({status})}),
        create: () => { throw new Error('Création de compte non disponible tant que les rôles et invitations ne sont pas migrés.'); }
      }
    : entity(name)}),
  auth: {
    me: () => request('/auth/me'),
    loginViaEmailPassword: (email,password) => request('/auth/login',{method:'POST',body:body({email,password})}),
    logout: async () => { await request('/auth/logout',{method:'POST'}); window.location.href='/connexion'; },
    updateMe: data => request('/auth/me',{method:'PATCH',body:body(data)}),
    register: data => request('/public/signup',{method:'POST',body:body(data)}),
    verifyOtp: data => request('/public/signup/verify',{method:'POST',body:body({email:data.email,otp:data.otpCode || data.otp})}),
    resendOtp: email => request('/public/signup/resend',{method:'POST',body:body({email})}),
    resetPasswordRequest: email => request('/public/password/forgot',{method:'POST',body:body({email})}),
    resetPassword: data => request('/public/password/reset',{method:'POST',body:body(data)}),
    acceptConsent: data => request('/auth/consent',{method:'POST',body:body(data)}),
    setToken: () => { throw new Error('Token-based sign-in is disabled; use cookie auth'); },
    redirectToLogin: () => { window.location.href='/connexion'; },
    isAuthenticated: async () => !!(await request('/auth/me').catch(() => null)),
  },
  app: {getPublicSettings: () => request('/public-settings')},
  permissions: {
    catalog: () => request('/permissions/catalog'),
    mine: () => request('/permissions/me')
  },
  onboarding: {
    config: () => request('/public/auth-config'),
    registrations: () => request('/admin/registrations'),
    decide: (id,data) => request('/admin/registrations/'+encodeURIComponent(id)+'/decision',{method:'POST',body:body(data)}),
    accountStatus: (id,status) => request('/admin/accounts/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:body({status})})
  },
  functions: {invoke: async (name, payload = {}) => request(`/functions/${encodeURIComponent(name)}`,{method:'POST',body:body(payload)})},
  integrations: {Core: new Proxy({}, {get: (_, name) => async () => {throw new Error(`Integration ${String(name)} not migrated yet`);}})},
  users: {
    inviteUser: (email, role = 'user') => {
      if (role !== 'user') throw new Error("L'invitation publique ne crée jamais un administrateur.");
      return request('/admin/invitations',{method:'POST',body:body({email})});
    }
  },
  asServiceRole: null
};
base44.asServiceRole = base44; // still subject to server-side admin-only authorization
export function clearMeCache() {}
