import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import dataMessages from '@/data/messages.json';
import dataServices from '@/data/services.json';
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'

export function MessagesTable() {

  function getFormattedDate(dateInput: string) {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);

    return `${year}-${month}-${day}`;
  }
  return (

    <Card>
      <Table >
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataMessages
            .map((item) => (

              <TableRow key={item.Id}>
                <TableCell key={item.Id}>
                  <Link href={`/message/${item.Id}`}>{item.Id}</Link>
                </TableCell>
                <TableCell className="w-full">
                  <Link href={`/message/${item.Id}`}>{item.Title}</Link>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {item.Services.map((service) => (
                      <Badge key={service} variant="secondary">
                        <div className="text-nowrap">
                          {service}
                        </div>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-nowrap">
                  {getFormattedDate(item.LastModifiedDateTime)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>

  );
}
