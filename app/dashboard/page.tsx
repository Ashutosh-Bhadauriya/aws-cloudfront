import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard</CardTitle>
          <CardDescription>
            Welcome! You are successfully logged in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            This is your protected dashboard area.
          </p>
          <form action="/api/logout" method="POST" className="w-full">
            <Button variant="outline" className="w-full">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
} 