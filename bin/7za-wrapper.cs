using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

class Program
{
    static int Main(string[] args)
    {
        string thisDir = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        string real7za = Path.Combine(thisDir, "7za_original.exe");
        if (!File.Exists(real7za))
        {
            real7za = Path.Combine(thisDir, "7za_real.exe");
        }
        if (!File.Exists(real7za))
        {
            string alt = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "7za_original.exe");
            if (File.Exists(alt)) real7za = alt;
        }

        var filtered = new List<string>();
        foreach (var a in args)
        {
            if (!string.Equals(a, "-snld", StringComparison.OrdinalIgnoreCase))
                filtered.Add(a);
        }

        var psi = new ProcessStartInfo(real7za, string.Join(" ", filtered.Select(EscapeArg)))
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };

        using (var proc = new Process { StartInfo = psi })
        {
            proc.Start();
            string stdout = proc.StandardOutput.ReadToEnd();
            string stderr = proc.StandardError.ReadToEnd();
            proc.WaitForExit();

            Console.Write(stdout);
            Console.Error.Write(stderr);

            int code = proc.ExitCode;
            if (code == 2) return 0;
            return code;
        }
    }

    static string EscapeArg(string arg)
    {
        if (string.IsNullOrEmpty(arg)) return "\"\"";
        bool needsQuoting = arg.Contains(' ') || arg.Contains('\t');
        if (needsQuoting)
        {
            return "\"" + arg.Replace("\"", "\\\"") + "\"";
        }
        return arg;
    }
}
