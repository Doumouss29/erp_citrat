import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function TimeTable({ entries, loading }) {
  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-xl font-bold text-slate-900">
            Détail des Pointages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 p-6">
        <CardTitle className="text-xl font-bold text-slate-900">
          Détail des Pointages ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Employé</TableHead>
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Heure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Aucun pointage pour cette période
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium">{entry.employee_name}</TableCell>
                    <TableCell className="text-slate-600">{entry.employee_code}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`${
                          entry.entry_type === "entry"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        } border`}
                      >
                        {entry.entry_type === "entry" ? (
                          <><LogIn className="w-3 h-3 mr-1" /> Entrée</>
                        ) : entry.entry_type === "break_start" ? (
                          <>Pause</> /* début de pause */
                        ) : entry.entry_type === "break_end" ? (
                          <>Reprise</>
                        ) : (
                          <><LogOut className="w-3 h-3 mr-1" /> Sortie</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(parseISO(entry.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-mono">{entry.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}