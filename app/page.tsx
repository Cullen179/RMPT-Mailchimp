"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { string, z } from "zod";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getMailchimp, getMembers } from "./action";
import { useDeferredValue, useState, useTransition } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

const FormSchema = z.object({
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
  authorization: z.string(),
});

export interface Member {
  listID: string,
  memberID: string,
  memberEmail: string,
}

interface List {
  id: string,
  name: string,
  num_members: number,
}

export default function InputForm() {
  const [fetchData, setFetchData] = useState(null);
  const [_, startTransition] = useTransition();
  const deferredFetchData = useDeferredValue(fetchData);
  const [progress, setProgress] = useState("");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: process.env.NEXT_PUBLIC_URL,
      authorization: "apikey " + process.env.NEXT_PUBLIC_API_KEY,
    },
  });

  async function getMembersData(url: string, authorization: string, listID: string, offset: number) {
      let memberData: Member[] = []; 
      for (let i = 0; i < offset; i++) {        
        let members = await getMembers(
          `${url.substring(0, url.lastIndexOf("?"))}/${listID}/members?offset=${i}&count=500`,
          authorization,
          listID
        );
        
        memberData = memberData.concat(members);
      }
    return memberData;
  }

  async function processList(eachList: any, url: string, authorization: string) {
    const workbook = XLSX.utils.book_new();
    const member_count =
      eachList.stats.member_count + eachList.stats.unsubscribe_count;
    console.log("member_count: " + member_count);

    const offset = Math.floor(member_count / 500) + 1;

    const memberData = await getMembersData(
      url,
      authorization,
      eachList.id,
      offset
    );

    const memberSheet = XLSX.utils.json_to_sheet(memberData);

    const listData = {
      listID: eachList.id,
      listName: eachList.name,
      num_members: member_count,
    };

    const listSheet = XLSX.utils.json_to_sheet([listData]);

    listSheet["!cols"] = [
      { wch: listData.listID.length },
      { wch: listData.listName.length },
      { wch: listData.num_members.toString().length },
    ];

    try {
      XLSX.utils.book_append_sheet(workbook, listSheet, "Audience List");
      XLSX.utils.book_append_sheet(workbook, memberSheet, "Members");
      XLSX.writeFile(workbook, eachList.name + ".xlsx", { compression: true });
      setProgress((progress) => "Append sheet: " + eachList.name);
    } catch (error) {
      console.log("error append sheet: " + eachList.name);
    }
  }

  async function exportCSV(url: string, authorization: string, fetchData: any) {
    for (const eachList of fetchData.lists) {
      await processList(eachList, url, authorization);
    }
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setProgress(progress => "Fetching data...");
    const fetchData = await getMailchimp(data.url, data.authorization);
    startTransition(() => {
      setFetchData(data => fetchData);
    });
    setProgress((progress) => "Exporting CSV...");
    
    await exportCSV(data.url, data.authorization, fetchData);
    setProgress((progress) => "");
  }

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-2/3 space-y-6"
        >
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Url</FormLabel>
                <FormControl>
                  <Input
                    placeholder="URL"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is your /list Mailchimp URL.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authorization</FormLabel>
                <FormControl>
                  <Input
                    placeholder="API Key"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is your Header Authorization.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-x-2 flex items-center">
            <Button
              type="submit"
              disabled={progress !== ""}
            >
              {progress !== "" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export Data
            </Button>
            <div className="text-slate-400">{progress}</div>
          </div>
        </form>
      </Form>
      <pre className="rounded-md bg-slate-950 p-4 border mt-4 w-full">
        <ScrollArea className="h-72 w-full">
          <code className="text-white">
            {deferredFetchData
              ? JSON.stringify(deferredFetchData, null, 2)
              : "No data yet"}
          </code>
        </ScrollArea>
      </pre>
    </div>
  );
}
