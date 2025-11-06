"use client";

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Network, User, LogIn, Moon, Sun, ChevronDown } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NodeDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function NodeDetailsPage({ params }: NodeDetailsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  // Mock node data - replace with actual GraphQL query
  const node = {
    id,
    title: 'JFK Assassination Evidence Analysis',
    type: 'Investigation',
    credibility: 85,
    content: 'Detailed analysis of evidence related to the JFK assassination...',
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb - Icon Only for Graph */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">
                    <Network className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Node Details</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <Button variant="ghost" size="icon">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user?.image || undefined} />
                        <AvatarFallback>
                          {session.user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{session.user?.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/api/auth/signout')}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push('/login')}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              )}
            </div>
          </div>

          {/* Node Title and Metadata */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{node.title}</h1>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {node.credibility}%
                  </div>
                  <div className="text-xs text-muted-foreground">Credibility</div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-sm text-muted-foreground">
                  Type: <span className="font-medium text-foreground">{node.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content with Tabs */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="contents" className="w-full">
                  <div className="border-b">
                    <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                      <TabsTrigger
                        value="contents"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                      >
                        Contents
                      </TabsTrigger>
                      <TabsTrigger
                        value="article"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                      >
                        Article
                      </TabsTrigger>
                      <TabsTrigger
                        value="inquiries"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                      >
                        Inquiries
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                      >
                        Activity
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6">
                    <TabsContent value="contents" className="mt-0">
                      <div className="prose dark:prose-invert max-w-none">
                        <p>{node.content}</p>
                        <p>This section contains the main content and evidence for this node.</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="article" className="mt-0">
                      <div className="prose dark:prose-invert max-w-none">
                        <h2>Article View</h2>
                        <p>Full article or document content will be displayed here.</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="inquiries" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Open Inquiries</h3>
                        <p className="text-muted-foreground">
                          Questions and investigations related to this node will appear here.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                        <div className="space-y-2">
                          <div className="flex items-start gap-3 text-sm">
                            <div className="text-muted-foreground">
                              {node.updated_at}
                            </div>
                            <div>Node updated by User</div>
                          </div>
                          <div className="flex items-start gap-3 text-sm">
                            <div className="text-muted-foreground">
                              {node.created_at}
                            </div>
                            <div>Node created by User</div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Collapsible Sections */}
          <div className="space-y-4">
            {/* Related Section */}
            <Card>
              <Collapsible defaultOpen>
                <CardHeader className="py-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80">
                    <CardTitle className="text-sm font-semibold">Related</CardTitle>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Related nodes and connections will appear here.
                      </div>
                      <ul className="space-y-1 text-sm">
                        <li>
                          <a href="#" className="text-primary hover:underline">
                            Related Investigation #1
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-primary hover:underline">
                            Related Evidence #2
                          </a>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Attachments Section */}
            <Card>
              <Collapsible defaultOpen>
                <CardHeader className="py-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80">
                    <CardTitle className="text-sm font-semibold">Attachments</CardTitle>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Media files and documents attached to this node.
                      </div>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-muted-foreground">📄</span>
                          <a href="#" className="text-primary hover:underline">
                            document.pdf
                          </a>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-muted-foreground">🖼️</span>
                          <a href="#" className="text-primary hover:underline">
                            image.jpg
                          </a>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
