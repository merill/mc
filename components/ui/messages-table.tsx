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
            <TableHead className="">ID</TableHead>
            <TableHead className="">Title</TableHead>
            <TableHead className="">Service</TableHead>
            <TableHead className="">Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataMessages
            .map((item) => (

              <TableRow key={item.Id}>
                <TableCell><a href={item.Id}>{item.Id}</a></TableCell>
                <TableCell className="w-full">
                  <a href={item.Id}>{item.Title}</a>
                </TableCell>
                <TableCell>
                  {item.Services.map((service) => (
                    <Badge>
                      <div className="text-nowrap">
                      {service}
                      </div>
                    </Badge>
                  ))}
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
