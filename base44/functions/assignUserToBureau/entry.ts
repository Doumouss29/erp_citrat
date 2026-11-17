import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { user_id, bureau_id, bureau_code } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id requis' }, { status: 400 });
    }

    // Use filter to find the user and update their data
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    
    if (!users || users.length === 0) {
      // Try listing all users and find by id
      const allUsers = await base44.asServiceRole.entities.User.list();
      const targetUser = allUsers.find(u => u.id === user_id);
      
      if (!targetUser) {
        return Response.json({ error: 'Utilisateur non trouvé', user_id }, { status: 404 });
      }
      
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        bureau_id,
        bureau_code
      });
    } else {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        bureau_id,
        bureau_code
      });
    }

    return Response.json({ success: true, bureau_id, bureau_code });
  } catch (error) {
    console.error('assignUserToBureau:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});