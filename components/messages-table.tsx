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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { getAllMessages, getFormattedDate } from "@/lib/messages";

export function MessagesTable() {

  const dataMessages = getAllMessages();
  return (

    <Card>
      <Table >
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Service</TableHead>
            <TableHead className="hidden md:table-cell">Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataMessages
            .map((item) => (

              <TableRow key={item.Id}>
                <TableCell key={item.Id} >
                  <div className="flex items-center gap-2">
                    <Link href={`/message/${item.Id}`}>{item.Id}</Link>
                    {(item.IsMajorChange &&
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="flex h-2 w-2 rounded-full bg-red-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Major change</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-full">
                  <Link href={`/message/${item.Id}`}>{item.Title}</Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="space-y-0.5">
                    {item?.Services?.map((service) => (
                      <Badge key={service} variant="secondary">
                        <div className="text-nowrap">
                          {service}
                        </div>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-nowrap hidden md:table-cell">
                  {getFormattedDate(item.LastModifiedDateTime)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>

  );
}
