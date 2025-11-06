import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Lightbulb, Users, Loader2, Heart, MessageCircle, Bookmark, Send, Check, Trash } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CollaborationPost {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  skills_needed: string[];
  created_at: string;
  profiles?: {
    full_name: string;
    college?: string;
  };
}

interface Comment {
  id: string;
  userName: string;
  text: string;
  created_at: string;
}

type InteractivePost = CollaborationPost & {
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
  bookmarked: boolean;
  applied: boolean;
};

const CollaborationPosts = () => {
  const [posts, setPosts] = useState<CollaborationPost[]>([]);
  const [interactivePosts, setInteractivePosts] = useState<InteractivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Frontend-only placeholder opportunity posts (non-persistent)
  const [placeholderPosts] = useState<CollaborationPost[]>(() => {
    const now = new Date().toISOString();
    return [
      {
        id: "startup-arcai",
        user_id: "startup-arcai",
        title: "ArcAI — Recruiting ML Engineers & Fullstack",
        description:
          "Seed-stage startup building AI-first hiring tools. Looking for ML engineers and a fullstack developer to ship our MVP.",
        category: "team-member",
        skills_needed: ["Python", "PyTorch", "React", "Postgres"],
        created_at: now,
        profiles: { full_name: "ArcAI", college: "N/A" },
      },
      {
        id: "startup-greengrid",
        user_id: "startup-greengrid",
        title: "GreenGrid — Sustainability hardware prototyping",
        description:
          "Hardware + software startup focusing on energy monitoring. Seeking embedded engineers and UX designers for pilot projects.",
        category: "team-member",
        skills_needed: ["Embedded C", "IoT", "UX Design"],
        created_at: now,
        profiles: { full_name: "GreenGrid", college: "N/A" },
      },
      {
        id: "startup-marketmatch",
        user_id: "startup-marketmatch",
        title: "MarketMatch — Marketplace for niche creators",
        description:
          "Pre-launch marketplace looking for a technical co-founder and growth lead. Strong product sense and marketplace experience preferred.",
        category: "co-founder",
        skills_needed: ["Product", "Growth", "Node.js", "Next.js"],
        created_at: now,
        profiles: { full_name: "MarketMatch", college: "N/A" },
      },
    ];
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "team-member",
    skills: "",
  });

  const STORAGE_KEY = "innovex.collab.posts.v1";

  useEffect(() => {
    fetchPosts();
    setupRealtimeSubscription();
  }, []);

  // load interactive state from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as InteractivePost[];
        setInteractivePosts(parsed);
      } catch (e) {
        console.warn("Failed to parse collab posts state", e);
      }
    }
  }, []);

  const fetchPosts = async () => {
    try {
      // supabase client generics can sometimes produce 'never' types here; cast to any for resiliency
      const res: any = await supabase
        .from("collaboration_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const data = res.data as any[] | null;
      const error = res.error;

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set((data?.map((p) => p.user_id) || []))];
      const profilesRes: any = await supabase
        .from("profiles")
        .select("id, full_name, college")
        .in("id", userIds);

      const profiles = profilesRes.data as any[] | null;

      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const postsWithProfiles = (data || []).map((post: any) => ({
        ...post,
        profiles: profilesMap.get(post.user_id),
      }));

      const fetched = postsWithProfiles as CollaborationPost[];
      setPosts(fetched);

      // merge fetched posts with placeholder + existing interactive state
      const all = [...placeholderPosts, ...fetched];

      setInteractivePosts((prev) => {
        const prevMap = new Map(prev.map((p) => [p.id, p]));
        const merged: InteractivePost[] = all.map((p) => {
          const existing = prevMap.get(p.id);
          if (existing) return { ...p, ...existing } as InteractivePost;
          // new interactive defaults
          return {
            ...p,
            likes: 0,
            likedByMe: false,
            comments: [],
            bookmarked: false,
            applied: false,
          } as InteractivePost;
        });
        // persist
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to load collaboration posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // helper to persist interactive posts
  const persistInteractive = (next: InteractivePost[]) => {
    setInteractivePosts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.warn(e); }
  };

  const isUUID = (s: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  };

  const handleDeletePost = async (post: InteractivePost) => {
    // if post id is not a UUID we treat it as a frontend-only placeholder and just remove locally
    if (!isUUID(post.id)) {
      const next = interactivePosts.filter((p) => p.id !== post.id);
      persistInteractive(next);
      toast({ title: "Removed", description: "Placeholder post removed", variant: "default" });
      return;
    }

    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    try {
      const delRes: any = await (supabase.from("collaboration_posts") as any).delete().eq("id", post.id).select();
      const error = delRes?.error;
      if (error) throw error;

      const next = interactivePosts.filter((p) => p.id !== post.id);
      persistInteractive(next);

      toast({ title: "Deleted", description: "Post deleted successfully" });
    } catch (err: any) {
      console.error("Failed to delete post:", err);
      toast({ title: "Error", description: err?.message || "Failed to delete post", variant: "destructive" });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("collaboration-posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userRes: any = await supabase.auth.getUser();
      const user = userRes?.data?.user;
      if (!user) throw new Error("Not authenticated");

      // Ensure a profile row exists for this user (avoid FK violations)
      try {
  const profileCheck: any = await (supabase.from("profiles") as any).select("id").eq("id", user.id).maybeSingle();
        if (!profileCheck?.data) {
          // Create a minimal profile using available metadata
          const displayName = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email || "User";
          const createProfile: any = await (supabase.from("profiles") as any).insert({ id: user.id, full_name: displayName });
          if (createProfile?.error) {
            console.error("Failed to create profile for user before inserting post:", createProfile.error);
            throw createProfile.error;
          }
        }
      } catch (profileErr) {
        console.error("Profile check/create failed:", profileErr);
        throw profileErr;
      }

      const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);

      const insertRes: any = await (supabase.from("collaboration_posts") as any).insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        skills_needed: skillsArray,
      });

      const error = insertRes?.error;
      if (error) {
        console.error("Insert error:", error, insertRes);
        throw error;
      }

      toast({
        title: "Success",
        description: "Collaboration post created successfully",
      });

      setFormData({ title: "", description: "", category: "team-member", skills: "" });
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create collaboration post",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "co-founder":
        return <Briefcase className="h-4 w-4" />;
      case "mentor":
        return <Lightbulb className="h-4 w-4" />;
      case "team-member":
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Collaboration Opportunities</CardTitle>
            <CardDescription>
              Find co-founders, mentors, and team members
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collaboration Post</DialogTitle>
                <DialogDescription>
                  Let others know what you're looking for
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Looking for a Technical Co-Founder"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co-founder">Co-Founder</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="team-member">Team Member</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what you're looking for..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills Needed (comma-separated)</Label>
                  <Input
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g., React, Node.js, UI/UX Design"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Post
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {interactivePosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No collaboration posts yet</p>
            <p className="text-sm">Be the first to post!</p>
          </div>
        ) : (
          interactivePosts.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {post.profiles?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{post.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {post.profiles?.full_name}
                          {post.profiles?.college && ` • ${post.profiles.college}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getCategoryIcon(post.category)}
                        {post.category}
                      </Badge>
                    </div>
                    <p className="text-sm">{post.description}</p>
                    {post.skills_needed && post.skills_needed.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.skills_needed.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={post.likedByMe ? "ghost" : "outline"}
                        onClick={() => {
                          const next = interactivePosts.map((p) =>
                            p.id === post.id
                              ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1 }
                              : p
                          );
                          persistInteractive(next);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-2" /> {post.likes}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const commentText = prompt("Add a comment:");
                          if (!commentText) return;
                          const comment: Comment = {
                            id: `c_${Date.now()}`,
                            userName: "You",
                            text: commentText,
                            created_at: new Date().toISOString(),
                          };
                          const next = interactivePosts.map((p) =>
                            p.id === post.id ? { ...p, comments: [...p.comments, comment] } : p
                          );
                          persistInteractive(next);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" /> {post.comments.length}
                      </Button>

                      <Button
                        size="sm"
                        variant={post.bookmarked ? "ghost" : "outline"}
                        onClick={() => {
                          const next = interactivePosts.map((p) =>
                            p.id === post.id ? { ...p, bookmarked: !p.bookmarked } : p
                          );
                          persistInteractive(next);
                        }}
                      >
                        <Bookmark className="h-4 w-4 mr-2" /> {post.bookmarked ? "Saved" : "Save"}
                      </Button>

                      <Button
                        size="sm"
                        variant={post.applied ? "secondary" : "outline"}
                        onClick={() => {
                          const next = interactivePosts.map((p) =>
                            p.id === post.id ? { ...p, applied: !p.applied } : p
                          );
                          persistInteractive(next);
                        }}
                      >
                        {post.applied ? (
                          <><Check className="h-4 w-4 mr-2"/> Applied</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2"/> Apply</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePost(post)}
                        title="Delete post"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {post.comments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {post.comments.map((c) => (
                          <div key={c.id} className="bg-muted p-2 rounded">
                            <div className="text-sm font-medium">{c.userName}</div>
                            <div className="text-sm">{c.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default CollaborationPosts;
