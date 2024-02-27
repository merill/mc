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

import dataMessages from './data/messages.json';
import dataServices from './data/services.json';

export function MessagesTable() {

    const [selectedService, setSelectedService] = useState<string[]>([]);

    const inArray = (selectedService, services) => services.some(v => selectedService.includes(v));

    const isItemShown = (item) => {
        const isInArray = inArray(selectedService, item.Services)
        
        return isInArray || selectedService.length === 0;
    }


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

            <Flex justifyContent="start">
                <MultiSelect
                    onValueChange={(value) => setSelectedService(value)}
                    placeholder="Filter by service..."
                    className="max-w-sm"
                >
                    {dataServices.map((item) => (
                        <MultiSelectItem key={item} value={item}>
                            {item}
                        </MultiSelectItem>
                    ))}
                </MultiSelect>
            </Flex>


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
                    {dataMessages
                        .filter((item) => isItemShown(item))
                        .map((item) => (

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