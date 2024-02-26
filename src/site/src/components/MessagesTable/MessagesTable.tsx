import { useState } from "react";
import {
    Badge,
    Card,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
    MultiSelect, MultiSelectItem, Flex
} from '@tremor/react';

import data from './messages.json';

export function MessagesTable() {
    
    function getFormattedDate(dateInput: string) {
        const date = new Date(dateInput);
        const year = date.getFullYear();
        const month = `0${date.getMonth() + 1}`.slice(-2);
        const day = `0${date.getDate()}`.slice(-2);

        return `${year}-${month}-${day}`;
    }
    return (
        <Card className='bg-transparent'>
            <h3 className="text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">Message Center</h3>
            <Table className="min-w-full">
                <TableHead>
                    <TableRow>
                        <TableHeaderCell className="">ID</TableHeaderCell>
                        <TableHeaderCell className="">Title</TableHeaderCell>
                        <TableHeaderCell className="">Service</TableHeaderCell>
                        <TableHeaderCell className="">Last updated</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((item) => (

                        <TableRow key={item.Id}>
                            <TableCell><a href={item.Id}>{item.Id}</a></TableCell>
                            <TableCell className="whitespace-normal w-full">
                                <a href={item.Id}>{item.Title}</a>
                            </TableCell>
                            <TableCell className="whitespace-normal truncate">
                                {item.Services.map((service) => (
                                    <Badge color="slate">
                                        {service}
                                    </Badge>
                                ))}
                            </TableCell>
                            <TableCell>
                                {getFormattedDate(item.LastModifiedDateTime)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}